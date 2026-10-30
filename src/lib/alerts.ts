import "server-only";
import { and, eq, inArray, isNull, lte, ne, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Session } from "@/lib/auth";
import { computeKpis } from "@/lib/nom035/kpis";
import { sampleSize } from "@/lib/nom035/score";
import { MIN_GROUP } from "@/lib/results";

export type Alert = {
  severity: "CRITICA" | "ALTA" | "MEDIA";
  kind: "ATS" | "ACCION" | "QUEJA" | "KPI" | "MUESTRA";
  title: string; detail: string; href: string; company: string; workplace: string;
};

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const daysAhead = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

/** Centros visibles para el usuario (CLIENTE: solo su empresa). */
async function scope(s: Session) {
  const wps = await db.query.workplaces.findMany({ with: { company: true, evaluations: true } });
  return wps.filter((w) => s.role !== "CLIENTE" || w.companyId === s.companyId);
}

/** Conteo rápido para el menú: casos ATS vencidos, acciones vencidas y quejas abiertas de más de 30 días. */
export async function alertCount(s: Session) {
  const wps = await scope(s);
  const wpIds = wps.map((w) => w.id), evIds = wps.flatMap((w) => w.evaluations.map((e) => e.id));
  if (!wpIds.length) return 0;
  const [[a], [b], [c]] = await Promise.all([
    evIds.length ? db.select({ n: sql<number>`count(*)::int` }).from(schema.atsFollowups)
      .innerJoin(schema.responses, eq(schema.responses.id, schema.atsFollowups.responseId))
      .where(and(inArray(schema.responses.evaluationId, evIds), eq(schema.atsFollowups.status, "IDENTIFICADO"), lte(schema.atsFollowups.identifiedAt, daysAgo(15)))) : [{ n: 0 }],
    evIds.length ? db.select({ n: sql<number>`count(*)::int` }).from(schema.planActions)
      .where(and(inArray(schema.planActions.evaluationId, evIds), isNull(schema.planActions.doneAt), lte(schema.planActions.dueDate, today()))) : [{ n: 0 }],
    db.select({ n: sql<number>`count(*)::int` }).from(schema.complaints)
      .where(and(inArray(schema.complaints.workplaceId, wpIds), ne(schema.complaints.status, "CERRADA"), lte(schema.complaints.receivedAt, daysAgo(30)))),
  ]);
  return a.n + b.n + c.n;
}

export async function getAlerts(s: Session): Promise<Alert[]> {
  const wps = await scope(s);
  const out: Alert[] = [];
  for (const w of wps) {
    const base = { company: w.company.name, workplace: w.name };
    const evIds = w.evaluations.map((e) => e.id);
    const evName = (id: string) => w.evaluations.find((e) => e.id === id)?.name ?? "";

    // 1. Casos de Guía I sin canalizar
    if (evIds.length) {
      const ats = await db.select({ evaluationId: schema.responses.evaluationId, identifiedAt: schema.atsFollowups.identifiedAt })
        .from(schema.atsFollowups).innerJoin(schema.responses, eq(schema.responses.id, schema.atsFollowups.responseId))
        .where(and(inArray(schema.responses.evaluationId, evIds), eq(schema.atsFollowups.status, "IDENTIFICADO")));
      for (const evId of [...new Set(ats.map((x) => x.evaluationId))]) {
        const list = ats.filter((x) => x.evaluationId === evId);
        const late = list.filter((x) => x.identifiedAt <= daysAgo(15)).length;
        const href = s.role === "CLIENTE" ? `/admin/evaluaciones/${evId}` : `/admin/evaluaciones/${evId}/confidencial`;
        if (late) out.push({ ...base, severity: "CRITICA", kind: "ATS", href, title: `${late} ${late === 1 ? "caso" : "casos"} de Guía I sin canalizar después de 15 días`, detail: `${evName(evId)} · requieren valoración clínica (numerales 5.4 y 8.1)` });
        if (list.length - late) out.push({ ...base, severity: "ALTA", kind: "ATS", href, title: `${list.length - late} ${list.length - late === 1 ? "caso" : "casos"} de Guía I por canalizar`, detail: `${evName(evId)} · identificados hace menos de 15 días` });
      }

      // 2. Acciones del programa vencidas o por vencer
      const acts = await db.query.planActions.findMany({ where: and(inArray(schema.planActions.evaluationId, evIds), isNull(schema.planActions.doneAt), lte(schema.planActions.dueDate, daysAhead(7))) });
      for (const evId of [...new Set(acts.map((a) => a.evaluationId))]) {
        const list = acts.filter((a) => a.evaluationId === evId);
        const late = list.filter((a) => a.dueDate < today());
        const soon = list.filter((a) => a.dueDate >= today());
        if (late.length) out.push({ ...base, severity: "ALTA", kind: "ACCION", href: `/admin/evaluaciones/${evId}/programa`, title: `${late.length} ${late.length === 1 ? "acción vencida" : "acciones vencidas"} del programa de intervención`, detail: late.slice(0, 2).map((a) => `${a.action} (${a.dueDate})`).join(" · ") });
        if (soon.length) out.push({ ...base, severity: "MEDIA", kind: "ACCION", href: `/admin/evaluaciones/${evId}/programa`, title: `${soon.length} ${soon.length === 1 ? "acción vence" : "acciones vencen"} en los próximos 7 días`, detail: soon.slice(0, 2).map((a) => `${a.action} (${a.dueDate})`).join(" · ") });
      }
    }

    // 3. Quejas abiertas de más de 30 días
    const oldQ = await db.query.complaints.findMany({ where: and(eq(schema.complaints.workplaceId, w.id), ne(schema.complaints.status, "CERRADA"), lte(schema.complaints.receivedAt, daysAgo(30))) });
    if (oldQ.length) out.push({ ...base, severity: oldQ.some((q) => q.category === "VIOLENCIA") ? "CRITICA" : "ALTA", kind: "QUEJA", href: `/admin/centros/${w.id}`, title: `${oldQ.length} ${oldQ.length === 1 ? "queja abierta" : "quejas abiertas"} por más de 30 días`, detail: oldQ.some((q) => q.category === "VIOLENCIA") ? "Incluye quejas por violencia laboral" : "Sin resolución documentada" });

    // 4. Evaluación más reciente con respuestas: KPIs en rojo y avance de la muestra
    const latest = [...w.evaluations].sort((a, b) => +b.createdAt - +a.createdAt);
    for (const ev of latest) {
      const rows = await db.query.responses.findMany({ where: eq(schema.responses.evaluationId, ev.id), columns: { items: true, demographics: true, atsRequires: true, atsEvent: true } });
      if (ev.status === "ABIERTA") {
        const need = ev.guide === "GUIA_III" ? sampleSize(w.headcount) : w.headcount;
        if (need && rows.length < need) out.push({ ...base, severity: "MEDIA", kind: "MUESTRA", href: `/admin/evaluaciones/${ev.id}`, title: `Captura abierta con ${rows.length} de ${need} respuestas requeridas`, detail: `${ev.name} · faltan ${need - rows.length} para la ${ev.guide === "GUIA_III" ? "muestra mínima" : "plantilla"}` });
      }
      if (rows.length < MIN_GROUP) continue;
      const recs = rows.map((r) => ({
        d: Object.fromEntries(Object.entries(r.demographics).map(([k, v]) => [k, v ?? "Sin dato"])),
        it: Array.from({ length: ev.guide === "GUIA_III" ? 72 : 46 }, (_, i) => (r.items as Record<string, number | null>)[i + 1] ?? null),
        g1: (r.atsRequires ? 2 : r.atsEvent ? 1 : 0) as 0 | 1 | 2,
      }));
      const red = computeKpis({ guide: ev.guide, records: recs, headcount: w.headcount, minGroup: MIN_GROUP }).filter((k) => k.light === "ROJO" && k.scope === "encuesta");
      if (red.length) out.push({ ...base, severity: "MEDIA", kind: "KPI", href: `/admin/evaluaciones/${ev.id}/indicadores?tab=kpis`, title: `${red.length} ${red.length === 1 ? "indicador" : "indicadores"} en rojo`, detail: `${ev.name} · ${red.slice(0, 4).map((k) => `${k.short} ${k.display}`).join(" · ")}${red.length > 4 ? "…" : ""}` });
      break; // solo la evaluación más reciente con datos
    }
  }
  const order = { CRITICA: 0, ALTA: 1, MEDIA: 2 };
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}
