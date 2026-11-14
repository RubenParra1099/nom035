import Link from "next/link";
import Help from "@/components/ui/Help";
import { eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { canEdit, requireUser } from "@/lib/auth";
import { getAlerts } from "@/lib/alerts";
import { GUIDES, levelFor } from "@/lib/nom035/guides";
import { sampleSize } from "@/lib/nom035/score";
import Portfolio, { type PortfolioRow } from "./Portfolio";

export const dynamic = "force-dynamic";

/** Cartera: cada empresa con su último resultado, avance de captura, casos de Guía I y alertas. */
export default async function CompaniesPage() {
  const s = await requireUser();
  const companies = await db.query.companies.findMany({
    where: s.role === "CLIENTE" ? eq(schema.companies.id, s.companyId ?? "") : undefined,
    with: { workplaces: { with: { evaluations: true } } },
  });
  const evIds = companies.flatMap((c) => c.workplaces.flatMap((w) => w.evaluations.map((e) => e.id)));
  const [stats, ats, alerts] = await Promise.all([
    evIds.length ? db.select({
      id: schema.responses.evaluationId, n: sql<number>`count(*)::int`, mean: sql<number>`avg(${schema.responses.finalScore})::float`,
      hi: sql<number>`count(*) filter (where ${schema.responses.finalLevel} in ('ALTO','MUY_ALTO'))::int`,
    }).from(schema.responses).where(inArray(schema.responses.evaluationId, evIds)).groupBy(schema.responses.evaluationId) : [],
    evIds.length ? db.select({ id: schema.responses.evaluationId, n: sql<number>`count(*)::int` }).from(schema.atsFollowups)
      .innerJoin(schema.responses, eq(schema.responses.id, schema.atsFollowups.responseId))
      .where(sql`${schema.atsFollowups.status} = 'IDENTIFICADO' and ${inArray(schema.responses.evaluationId, evIds)}`).groupBy(schema.responses.evaluationId) : [],
    getAlerts(s),
  ]);
  const st = (id: string) => stats.find((x) => x.id === id);

  const rows: PortfolioRow[] = companies.map((c) => {
    let n = 0, target = 0, hiN = 0, wsum = 0, wN = 0, atsPend = 0, openEvals = 0;
    let latestDate = 0, latestName = "", worst: { level: number; label: string } | null = null;
    for (const w of c.workplaces) {
      const last = [...w.evaluations].sort((a, b) => +b.createdAt - +a.createdAt)[0];
      openEvals += w.evaluations.filter((e) => e.status === "ABIERTA").length;
      atsPend += w.evaluations.reduce((t, e) => t + (ats.find((x) => x.id === e.id)?.n ?? 0), 0);
      if (!last) continue;
      const x = st(last.id);
      n += x?.n ?? 0;
      target += w.headcount > 50 ? sampleSize(w.headcount) : w.headcount;
      if (+last.createdAt > latestDate) { latestDate = +last.createdAt; latestName = last.name; }
      if (x && x.n >= 5) {
        hiN += x.hi; wsum += x.mean * x.n; wN += x.n;
        const lv = levelFor(x.mean, GUIDES[last.guide].finalCuts);
        const rank = ["NULO", "BAJO", "MEDIO", "ALTO", "MUY_ALTO"].indexOf(lv);
        if (!worst || rank > worst.level) worst = { level: rank, label: lv };
      }
    }
    const al = alerts.filter((a) => a.company === c.name);
    return {
      id: c.id, name: c.name, sector: c.sector, rfc: c.rfc, centros: c.workplaces.length,
      trabajadores: c.workplaces.reduce((t, w) => t + w.headcount, 0),
      evaluaciones: c.workplaces.reduce((t, w) => t + w.evaluations.length, 0), openEvals,
      respuestas: n, avance: target ? Math.min(100, Math.round((n / target) * 100)) : null,
      latest: latestName ? { name: latestName, date: new Date(latestDate).toISOString().slice(0, 10) } : null,
      worstLevel: worst?.label ?? null, hiPct: wN ? (hiN / wN) * 100 : null, meanFinal: wN ? wsum / wN : null,
      atsPend, alertsCrit: al.filter((a) => a.severity === "CRITICA").length, alertsTotal: al.length,
    };
  });

  const tot = {
    empresas: rows.length, centros: rows.reduce((t, r) => t + r.centros, 0),
    respuestas: rows.reduce((t, r) => t + r.respuestas, 0), abiertas: rows.reduce((t, r) => t + r.openEvals, 0),
    ats: rows.reduce((t, r) => t + r.atsPend, 0), criticas: alerts.filter((a) => a.severity === "CRITICA").length,
  };
  const tiles = [
    ["Empresas", tot.empresas, `${tot.centros} centros de trabajo`, "", "cartera.empresas"],
    ["Respuestas", tot.respuestas.toLocaleString("es-MX"), "en la última evaluación de cada centro", "", "cartera.respuestas"],
    ["Capturas abiertas", tot.abiertas, "evaluaciones recibiendo respuestas", "", "cartera.capturas"],
    ["Guía I sin canalizar", tot.ats, "casos que requieren valoración", tot.ats ? "text-red-600" : "", "cartera.guia1"],
    ["Alertas críticas", tot.criticas, "requieren atención hoy", tot.criticas ? "text-red-600" : "", "cartera.criticas"],
  ] as const;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-ink">{s.role === "CLIENTE" ? "Mi empresa" : "Cartera de clientes"}<Help id="cartera" /></h1>
          <p className="text-sm text-gray-500">Resultado más reciente, avance de la captura, casos de Guía I y alertas de cada empresa.</p>
        </div>
        {canEdit(s) && <Link href="/admin/empresas/nueva" className="btn-primary">+ Nuevo cliente</Link>}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {tiles.map(([l, v, d, tone, h]) => (
          <div key={l} className="card p-4">
            <div className="flex items-center justify-between gap-1 text-xs font-medium text-gray-500">{l}<Help id={h} /></div>
            <div className={`mt-1 text-2xl font-semibold tabular-nums text-ink ${tone}`}>{v}</div>
            <div className="text-[11px] text-gray-500">{d}</div>
          </div>
        ))}
      </div>

      <Portfolio rows={rows} />
    </div>
  );
}
