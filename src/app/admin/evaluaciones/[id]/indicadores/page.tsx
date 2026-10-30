import { notFound } from "next/navigation";
import { canSeeCompany, requireUser } from "@/lib/auth";
import { DIMENSIONS, MIN_GROUP, loadDashboard } from "@/lib/results";
import { GUIDES } from "@/lib/nom035/guides";
import Dashboard from "@/components/dashboard/Dashboard";
import PrintButton from "@/components/PrintButton";
import EvalHeader from "@/components/EvalHeader";

export const dynamic = "force-dynamic";

export default async function IndicatorsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireUser();
  const data = await loadDashboard(id, { folio: s.role !== "CLIENTE" });
  if (!data || !canSeeCompany(s, data.evaluation.companyId)) notFound();
  const ev = data.evaluation;
  return (
    <div className="space-y-4">
      <EvalHeader ev={{ id: ev.id, name: ev.name, guide: ev.guide, includeGuideI: ev.includeGuideI, workplaceId: ev.workplaceId, workplaceName: ev.workplace, companyId: ev.companyId, companyName: ev.company }}
        active="tablero" canSeeConfidential={s.role !== "CLIENTE"} title={`Tablero · ${ev.name}`} subtitle={`${ev.company} · ${ev.workplace} · ${GUIDES[ev.guide].name}`} right={<PrintButton />} />
      <Dashboard evaluation={ev} records={data.records} previous={data.previous} intervention={data.intervention} areaHeadcount={data.areaHeadcount} dimensions={DIMENSIONS}
        minGroup={MIN_GROUP} canSeeConfidential={s.role !== "CLIENTE"} />
    </div>
  );
}
