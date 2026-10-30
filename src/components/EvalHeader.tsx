import Link from "next/link";

export type EvalTab = "evaluacion" | "tablero" | "programa" | "gestion" | "guia1";

/** Encabezado contextual: ruta Empresa › Centro › Evaluación y pestañas de la evaluación. */
export default function EvalHeader({ ev, active, canSeeConfidential, title, subtitle, right }: {
  ev: { id: string; name: string; guide: "GUIA_II" | "GUIA_III"; includeGuideI: boolean; workplaceId: string; workplaceName: string; companyId: string; companyName: string };
  active: EvalTab; canSeeConfidential: boolean; title?: string; subtitle?: React.ReactNode; right?: React.ReactNode;
}) {
  const tabs: { id: EvalTab; label: string; href: string }[] = [
    { id: "evaluacion", label: "Evaluación", href: `/admin/evaluaciones/${ev.id}` },
    { id: "tablero", label: "Tablero e indicadores", href: `/admin/evaluaciones/${ev.id}/indicadores` },
    { id: "programa", label: "Programa de intervención", href: `/admin/evaluaciones/${ev.id}/programa` },
    { id: "gestion", label: "Quejas y capacitación", href: `/admin/centros/${ev.workplaceId}?ev=${ev.id}` },
    ...(canSeeConfidential ? [{ id: "guia1" as EvalTab, label: "Seguimiento Guía I", href: `/admin/evaluaciones/${ev.id}/confidencial` }] : []),
  ];
  return (
    <div className="space-y-4">
      <nav aria-label="Ruta" className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500 print:hidden">
        <Link href="/admin" className="hover:text-gray-900">Empresas</Link><span aria-hidden>›</span>
        <Link href={`/admin/empresas/${ev.companyId}`} className="hover:text-gray-900">{ev.companyName}</Link><span aria-hidden>›</span>
        <span>{ev.workplaceName}</span><span aria-hidden>›</span>
        <Link href={`/admin/evaluaciones/${ev.id}`} className="font-medium text-gray-700 hover:text-gray-900">{ev.name}</Link>
      </nav>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">{title ?? ev.name}</h1>
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">{ev.guide === "GUIA_III" ? "Guía III · 72" : "Guía II · 46"}</span>
            {ev.includeGuideI && <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">+ Guía I</span>}
          </div>
          {subtitle && <div className="mt-1 text-sm text-gray-500">{subtitle}</div>}
        </div>
        {right}
      </div>
      <div className="flex gap-1 overflow-x-auto border-b border-line print:hidden" role="tablist">
        {tabs.map((t) => (
          <Link key={t.id} href={t.href} role="tab" aria-selected={active === t.id}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition ${active === t.id ? "border-brand-600 text-brand-700" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
            {t.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
