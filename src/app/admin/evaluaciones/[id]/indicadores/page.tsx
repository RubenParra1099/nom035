import Link from "next/link";
import { notFound } from "next/navigation";
import { canSeeCompany, requireUser } from "@/lib/auth";
import { DIMENSIONS, MIN_GROUP, loadDashboard } from "@/lib/results";
import { GUIDES } from "@/lib/nom035/guides";
import Dashboard from "@/components/dashboard/Dashboard";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default async function IndicatorsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireUser();
  const data = await loadDashboard(id);
  if (!data || !canSeeCompany(s, data.evaluation.companyId)) notFound();
  const ev = data.evaluation;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href={`/admin/evaluaciones/${id}`} className="text-sm text-gray-500 hover:underline print:hidden">← {ev.name}</Link>
          <h1 className="text-2xl font-semibold">Tablero de resultados · {ev.company}</h1>
          <p className="text-sm text-gray-500">{ev.workplace} · {ev.name} · {GUIDES[ev.guide].name}{ev.includeGuideI ? " + Guía I" : ""}</p>
        </div>
        <PrintButton />
      </div>
      <Dashboard evaluation={ev} records={data.records} previous={data.previous} dimensions={DIMENSIONS}
        minGroup={MIN_GROUP} canSeeConfidential={s.role !== "CLIENTE"} />
    </div>
  );
}
