import { notFound } from "next/navigation";
import { canEdit, canSeeCompany, requireUser } from "@/lib/auth";
import { policyContext } from "@/lib/policyContext";
import { GUIDES, LEVELS, LEVEL_LABEL, levelFor } from "@/lib/nom035/guides";
import { MIN_GROUP } from "@/lib/results";
import EvalHeader from "@/components/EvalHeader";
import ProposalDoc, { type ProposalData } from "./ProposalDoc";

export const dynamic = "force-dynamic";
const r1 = (x: number) => Math.round(x * 10) / 10;

export default async function ProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireUser();
  const ctx = await policyContext(id);
  if (!ctx || !canSeeCompany(s, ctx.ev.companyId)) notFound();
  const { ev, agg, prevAgg, recs, kpis } = ctx;
  const g = GUIDES[ev.guide];

  let data: ProposalData | null = null;
  if (agg && ctx.n >= MIN_GROUP) {
    // Meta de calificación final: bajar al nivel inferior si está a menos de 15%; si no, reducir 15%.
    const li = LEVELS.indexOf(agg.final.level);
    const lower = li > 0 ? g.finalCuts[li - 1] : null;
    const finalTarget = lower !== null && agg.final.mean * 0.85 <= lower ? lower - 0.1 : agg.final.mean * 0.85;
    const hiTarget = ctx.hiPct * 0.7;
    const doms = agg.domains.filter((d) => LEVELS.indexOf(d.level) >= 2)
      .map((d) => ({ name: d.name, category: d.category, level: LEVEL_LABEL[d.level], mean: r1(d.mean), hiPct: Math.round(((d.distribution.ALTO + d.distribution.MUY_ALTO) / agg.n) * 100),
        delta: prevAgg ? r1(d.mean - (prevAgg.domains.find((x) => x.name === d.name)?.mean ?? d.mean)) : null }))
      .sort((a, b) => b.hiPct - a.hiPct);
    const kpiTargets = new Map<string, ProposalData["targets"][number]>();
    for (const r of recs) for (const k of r.kpis) if (k.target && !kpiTargets.has(k.id) && k.light !== "VERDE") kpiTargets.set(k.id, { label: `${k.short} · ${k.name}`, now: k.display, target: k.target, light: k.light });
    data = {
      company: ev.company, workplace: ev.workplace, evaluation: ev.name, guide: g.name, headcount: ev.headcount, n: ctx.n,
      final: { mean: r1(agg.final.mean), level: LEVEL_LABEL[agg.final.level], prev: prevAgg ? r1(prevAgg.final.mean) : null, prevName: ctx.prevName },
      hiPct: Math.round(ctx.hiPct), ats: ctx.data.records.filter((r) => r.g1 === 2).length, domains: doms,
      redKpis: kpis.filter((k) => k.light === "ROJO").length,
      targets: [
        { label: "Calificación final del cuestionario", now: `${r1(agg.final.mean)} (${LEVEL_LABEL[agg.final.level]})`, target: `${r1(finalTarget)} (${LEVEL_LABEL[levelFor(finalTarget, g.finalCuts)]})`, light: "AMARILLO" },
        { label: "Trabajadores en nivel alto o muy alto", now: `${Math.round(ctx.hiPct)}%`, target: `${Math.round(hiTarget)}% o menos`, light: ctx.hiPct >= 30 ? "ROJO" : "AMARILLO" },
        ...[...kpiTargets.values()].slice(0, 8),
      ],
      recs: recs.map((r) => ({ id: r.policy.id, title: r.policy.title, tier: r.tier, type: r.policy.type, level: r.policy.level, numeral: r.policy.numeral,
        horizon: r.policy.horizon, effort: r.policy.effort, purpose: r.policy.purpose, actions: r.policy.actions, areas: r.areas.map((a) => a.name), domain: r.domain?.name ?? null })),
    };
  }
  return (
    <div className="space-y-4">
      <div className="print:hidden"><EvalHeader ev={{ id: ev.id, name: ev.name, guide: ev.guide, includeGuideI: ev.includeGuideI, workplaceId: ev.workplaceId, workplaceName: ev.workplace, companyId: ev.companyId, companyName: ev.company }}
        active="tablero" canSeeConfidential={s.role !== "CLIENTE"} title="Propuesta de mejora" subtitle={`Documento ejecutivo para la dirección con base en ${ev.name}`} /></div>
      {data ? <ProposalDoc data={data} consultant={s.name} editable={canEdit(s)} />
        : <div className="card p-10 text-center text-gray-600">Se necesitan al menos {MIN_GROUP} respuestas para generar la propuesta.</div>}
    </div>
  );
}
