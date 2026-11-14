import { notFound } from "next/navigation";
import { canEdit, canSeeCompany, requireUser } from "@/lib/auth";
import { policyContext } from "@/lib/policyContext";
import { POLICIES } from "@/lib/nom035/policies";
import { GUIDES, LEVEL_LABEL } from "@/lib/nom035/guides";
import EvalHeader from "@/components/EvalHeader";
import PolicyDoc from "./PolicyDoc";

export const dynamic = "force-dynamic";

export default async function PolicyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireUser();
  const ctx = await policyContext(id);
  if (!ctx || !canSeeCompany(s, ctx.ev.companyId)) notFound();
  const { ev, agg, recs } = ctx;
  const recommended = new Map(recs.map((r) => [r.policy.id, r.tier]));
  const commitments = POLICIES.map((p) => ({ id: p.id, title: p.title, numeral: p.numeral, text: p.commitment, tier: recommended.get(p.id) ?? null }))
    .sort((a, b) => (a.tier ? 0 : 1) - (b.tier ? 0 : 1));
  return (
    <div className="space-y-4">
      <div className="print:hidden"><EvalHeader ev={{ id: ev.id, name: ev.name, guide: ev.guide, includeGuideI: ev.includeGuideI, workplaceId: ev.workplaceId, workplaceName: ev.workplace, companyId: ev.companyId, companyName: ev.company }}
        active="tablero" canSeeConfidential={s.role !== "CLIENTE"} title="Política de prevención"
        subtitle={`Borrador personalizado (numeral 5.1) con base en ${ev.name} · ${GUIDES[ev.guide].name}`} /></div>
      <PolicyDoc company={ev.company} workplace={ev.workplace} evaluation={ev.name} editable={canEdit(s)}
        result={agg ? { level: LEVEL_LABEL[agg.final.level], mean: agg.final.mean.toFixed(1), hiPct: Math.round(ctx.hiPct), n: ctx.n } : null}
        commitments={commitments} />
    </div>
  );
}
