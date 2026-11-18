import "server-only";
import { inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { GUIDES, levelFor } from "@/lib/nom035/guides";
import { complianceChecks, fineExposure, type CheckResult } from "@/lib/nom035/compliance";
import { MIN_GROUP } from "@/lib/results";

export type CentroCompliance = {
  companyId: string; company: string; workplaceId: string; workplace: string; headcount: number;
  evaluation: { id: string; name: string } | null; n: number;
  index: number | null; checks: CheckResult[]; fines: { min: number; max: number; pending: number };
  exams: number; dissemination: number | null;
};

/** Índice de cumplimiento NOM-035 de la última evaluación de cada centro, calculado en lote (sin cargar respuestas completas). */
export async function complianceOverview(): Promise<CentroCompliance[]> {
  const companies = await db.query.companies.findMany({ with: { workplaces: { with: { evaluations: true } } } });
  const centros = companies.flatMap((c) => c.workplaces.map((w) => ({ c, w, ev: [...w.evaluations].sort((a, b) => +b.createdAt - +a.createdAt)[0] ?? null })));
  const evIds = centros.flatMap((x) => (x.ev ? [x.ev.id] : []));
  const wpIds = centros.map((x) => x.w.id);
  if (!wpIds.length) return [];
  const byWp = <T extends { k: string; n: number }>(rows: T[]) => new Map(rows.map((r) => [r.k, r.n]));
  const [stats, atsCan, actions, reports, complaints, trainings, exams, dis] = await Promise.all([
    evIds.length ? db.select({ id: schema.responses.evaluationId, n: sql<number>`count(*)::int`, mean: sql<number>`avg(${schema.responses.finalScore})::float`,
      ats: sql<number>`count(*) filter (where ${schema.responses.atsRequires})::int` }).from(schema.responses).where(inArray(schema.responses.evaluationId, evIds)).groupBy(schema.responses.evaluationId) : [],
    evIds.length ? db.select({ k: schema.responses.evaluationId, n: sql<number>`count(*)::int` }).from(schema.atsFollowups)
      .innerJoin(schema.responses, sql`${schema.responses.id} = ${schema.atsFollowups.responseId}`)
      .where(sql`${inArray(schema.responses.evaluationId, evIds)} and (${schema.atsFollowups.canalizedAt} is not null or ${schema.atsFollowups.status} in ('CANALIZADO','EN_ATENCION','ATENDIDO'))`)
      .groupBy(schema.responses.evaluationId) : [],
    evIds.length ? db.select({ ev: schema.planActions.evaluationId, dueDate: schema.planActions.dueDate, doneAt: schema.planActions.doneAt }).from(schema.planActions).where(inArray(schema.planActions.evaluationId, evIds)) : [],
    evIds.length ? db.select({ ev: schema.evaluationReports.evaluationId, d: schema.evaluationReports.reportDate, c: schema.evaluationReports.conclusions }).from(schema.evaluationReports).where(inArray(schema.evaluationReports.evaluationId, evIds)) : [],
    db.select({ k: schema.complaints.workplaceId, n: sql<number>`count(*)::int` }).from(schema.complaints).where(inArray(schema.complaints.workplaceId, wpIds)).groupBy(schema.complaints.workplaceId),
    db.select({ k: schema.trainings.workplaceId, n: sql<number>`count(*)::int` }).from(schema.trainings).where(inArray(schema.trainings.workplaceId, wpIds)).groupBy(schema.trainings.workplaceId),
    db.select({ k: schema.medicalExams.workplaceId, n: sql<number>`count(*)::int` }).from(schema.medicalExams).where(inArray(schema.medicalExams.workplaceId, wpIds)).groupBy(schema.medicalExams.workplaceId),
    db.select({ k: schema.disseminations.workplaceId, n: sql<number>`count(${schema.disseminationAcks.id})::int` }).from(schema.disseminations)
      .leftJoin(schema.disseminationAcks, sql`${schema.disseminationAcks.disseminationId} = ${schema.disseminations.id}`)
      .where(inArray(schema.disseminations.workplaceId, wpIds)).groupBy(schema.disseminations.id, schema.disseminations.workplaceId),
  ]);
  const can = byWp(atsCan), comp = byWp(complaints), tr = byWp(trainings), ex = byWp(exams);
  const disMax = new Map<string, number>();
  for (const r of dis) disMax.set(r.k, Math.max(disMax.get(r.k) ?? 0, r.n));

  return centros.map(({ c, w, ev }) => {
    const st = ev ? stats.find((x) => x.id === ev.id) : undefined;
    const n = st?.n ?? 0;
    const headcount = ev?.headcount ?? w.headcount;
    const dissemination = disMax.has(w.id) && headcount ? Math.min(1, disMax.get(w.id)! / headcount) : null;
    const base = { companyId: c.id, company: c.name, workplaceId: w.id, workplace: w.name, headcount, n, exams: ex.get(w.id) ?? 0, dissemination };
    if (!ev) return { ...base, evaluation: null, index: null, checks: [], fines: { min: 0, max: 0, pending: 0 } };
    const rep = reports.find((r) => r.ev === ev.id);
    const atsRequired = st?.ats ?? 0;
    const { checks, index } = complianceChecks({
      guide: ev.guide, includeGuideI: ev.includeGuideI, headcount, n,
      finalLevel: st && n >= MIN_GROUP ? levelFor(st.mean, GUIDES[ev.guide].finalCuts) : null,
      atsRequired, atsCanalized: Math.min(can.get(ev.id) ?? 0, atsRequired),
      actions: actions.filter((a) => a.ev === ev.id).map((a) => ({ dueDate: a.dueDate, doneAt: a.doneAt })),
      complaints: comp.get(w.id) ?? 0, trainings: tr.get(w.id) ?? 0, reportSaved: !!rep?.d || !!rep?.c,
      manual: ev.compliance ?? {}, exams: base.exams, dissemination,
    });
    const f = fineExposure(checks);
    return { ...base, evaluation: { id: ev.id, name: ev.name }, index, checks, fines: { min: f.min, max: f.max, pending: f.pending.length } };
  });
}
