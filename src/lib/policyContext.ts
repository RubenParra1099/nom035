import { aggregate, scoreWorker } from "@/lib/nom035/score";
import { computeKpis } from "@/lib/nom035/kpis";
import { recommendPolicies } from "@/lib/nom035/policies";
import { MIN_GROUP, loadDashboard } from "@/lib/results";

/** Resultados, KPIs y políticas recomendadas de una evaluación (sin filtros), para la política y la propuesta de mejora. */
export async function policyContext(evaluationId: string) {
  const data = await loadDashboard(evaluationId);
  if (!data) return null;
  const ev = data.evaluation;
  const toScores = (rs: typeof data.records) => rs.map((r) => scoreWorker(ev.guide, Object.fromEntries(r.it.map((v, i) => [i + 1, v]))));
  const scores = toScores(data.records);
  const prev = data.previous[0];
  const prevScores = prev ? toScores(prev.records) : [];
  const agg = scores.length ? aggregate(ev.guide, scores) : null;
  const prevAgg = prevScores.length >= MIN_GROUP ? aggregate(ev.guide, prevScores) : null;
  const kpis = scores.length ? computeKpis({ guide: ev.guide, records: data.records, prevRecords: prev?.records, headcount: ev.headcount, minGroup: MIN_GROUP,
    intervention: data.intervention, areaHeadcount: data.areaHeadcount, population: ev.headcount || null }) : [];
  const recs = scores.length ? recommendPolicies({
    guide: ev.guide, records: data.records, scores, headcount: ev.headcount, kpis,
    prevDomains: prevAgg ? Object.fromEntries(prevAgg.domains.map((d) => [d.name, d.mean])) : undefined,
    atsRequired: data.records.filter((r) => r.g1 === 2).length, complaints: data.intervention.complaints.length, minGroup: MIN_GROUP,
  }) : [];
  const hi = agg ? agg.final.distribution.ALTO + agg.final.distribution.MUY_ALTO : 0;
  return { data, ev, agg, prevAgg, prevName: prev?.name ?? null, kpis, recs, n: scores.length, hiPct: agg && agg.n ? (hi / agg.n) * 100 : 0 };
}
