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

export default async function AlertsPage() {
  const s = await requireUser();
  const alerts = await getAlerts(s);
  const groups = (["CRITICA", "ALTA", "MEDIA"] as const).map((sev) => ({ sev, list: alerts.filter((a) => a.severity === sev) }));
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Alertas</h1>
        <p className="text-sm text-gray-500">Se calculan al momento con los datos de todas tus empresas: casos de Guía I, programa de intervención, quejas, indicadores en rojo y avance de la captura.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {groups.map(({ sev, list }) => (
          <div key={sev} className="card flex items-center gap-4 p-4">
            <span className="grid h-11 w-11 place-items-center rounded-full text-lg font-bold" style={{ background: SEV[sev].bg, color: SEV[sev].fg }}>{list.length}</span>
            <div><div className="font-semibold text-ink">{SEV[sev].label}</div><div className="text-xs text-gray-500">{SEV[sev].desc}</div></div>
          </div>
        ))}
      </div>
      {alerts.length === 0 && <div className="card p-10 text-center text-gray-600">Sin alertas. Todo está al día.</div>}
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
