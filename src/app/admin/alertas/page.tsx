import Help from "@/components/ui/Help";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getAlerts, type Alert } from "@/lib/alerts";

export const dynamic = "force-dynamic";

const SEV: Record<Alert["severity"], { label: string; bg: string; fg: string; desc: string }> = {
  CRITICA: { label: "Crítica", bg: "var(--lv-muyalto)", fg: "var(--lv-muyalto-ink)", desc: "Incumplimiento directo de la norma o riesgo para un trabajador" },
  ALTA: { label: "Alta", bg: "var(--lv-alto)", fg: "var(--lv-alto-ink)", desc: "Plazos vencidos" },
  MEDIA: { label: "Media", bg: "var(--lv-medio)", fg: "var(--lv-medio-ink)", desc: "Seguimiento" },
};
const KIND: Record<Alert["kind"], string> = { ATS: "Guía I", ACCION: "Programa de intervención", QUEJA: "Buzón de quejas", KPI: "Indicadores", MUESTRA: "Captura" };

export default async function AlertsPage({ searchParams }: { searchParams: Promise<{ sev?: string; empresa?: string; tipo?: string }> }) {
  const s = await requireUser();
  const q = await searchParams;
  const all = await getAlerts(s);
  const companies = [...new Set(all.map((a) => a.company))].sort((a, b) => a.localeCompare(b, "es"));
  const alerts = all.filter((a) => (!q.sev || a.severity === q.sev) && (!q.empresa || a.company === q.empresa) && (!q.tipo || a.kind === q.tipo));
  const link = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ sev: q.sev, empresa: q.empresa, tipo: q.tipo, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/admin/alertas${p.toString() ? `?${p}` : ""}`;
  };
  const filtered = !!(q.sev || q.empresa || q.tipo);
  const groups = (["CRITICA", "ALTA", "MEDIA"] as const).map((sev) => ({ sev, list: alerts.filter((a) => a.severity === sev) }));
  const counts = (["CRITICA", "ALTA", "MEDIA"] as const).map((sev) => all.filter((a) => (!q.empresa || a.company === q.empresa) && (!q.tipo || a.kind === q.tipo) && a.severity === sev).length);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">Alertas<Help id="alertas" /><Help id="al.severidad" /></h1>
        <p className="text-sm text-gray-500">Se calculan al momento con los datos de todas tus empresas: casos de Guía I, programa de intervención, quejas, indicadores en rojo y avance de la captura.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {groups.map(({ sev }) => (
          <Link key={sev} href={link({ sev: q.sev === sev ? undefined : sev })} aria-pressed={q.sev === sev}
            className={`card flex items-center gap-4 p-4 transition ${q.sev === sev ? "ring-2 ring-brand-600" : "hover:border-brand-600"}`}>
            <span className="grid h-11 w-11 place-items-center rounded-full text-lg font-bold" style={{ background: SEV[sev].bg, color: SEV[sev].fg }}>{counts[["CRITICA", "ALTA", "MEDIA"].indexOf(sev)]}</span>
            <div><div className="font-semibold text-ink">{SEV[sev].label}</div><div className="text-xs text-gray-500">{SEV[sev].desc}</div></div>
          </Link>
        ))}
      </div>
      {all.length > 0 && (
        <form className="card flex flex-wrap items-end gap-3 p-4" action="/admin/alertas">
          {q.sev && <input type="hidden" name="sev" value={q.sev} />}
          <label className="text-sm"><span className="label">Empresa</span>
            <select name="empresa" defaultValue={q.empresa ?? ""} className="input w-64"><option value="">Todas</option>{companies.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="text-sm"><span className="label">Tipo</span>
            <select name="tipo" defaultValue={q.tipo ?? ""} className="input w-56"><option value="">Todos</option>{Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <button className="btn-secondary">Aplicar</button>
          {filtered && <Link href="/admin/alertas" className="text-sm font-medium text-brand-700 hover:underline">Quitar filtros</Link>}
          <span className="ml-auto text-sm text-gray-500">{alerts.length} de {all.length} alertas</span>
        </form>
      )}
      {all.length === 0 && <div className="card p-10 text-center text-gray-600">Sin alertas. Todo está al día.</div>}
      {all.length > 0 && alerts.length === 0 && <div className="card p-8 text-center text-gray-600">Ninguna alerta con estos filtros.</div>}
      {groups.filter((x) => x.list.length).map(({ sev, list }) => (
        <section key={sev} className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{SEV[sev].label}</h2>
          <div className="card divide-y divide-gray-100 overflow-hidden">
            {list.map((a, i) => (
              <Link key={i} href={a.href} className="flex items-start gap-3 p-4 hover:bg-gray-50">
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SEV[sev].bg }} />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-ink">{a.title}</span>
                  <span className="block truncate text-sm text-gray-600">{a.detail}</span>
                  <span className="mt-0.5 block text-xs text-gray-500">{a.company} · {a.workplace} · {KIND[a.kind]}</span>
                </span>
                <span aria-hidden className="text-gray-400">→</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
