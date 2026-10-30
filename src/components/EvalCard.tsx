import Link from "next/link";
import { LEVEL_LABEL, type Level } from "@/lib/nom035/guides";

const LV: Record<Level, [string, string]> = {
  NULO: ["var(--lv-nulo)", "var(--lv-nulo-ink)"], BAJO: ["var(--lv-bajo)", "var(--lv-bajo-ink)"], MEDIO: ["var(--lv-medio)", "var(--lv-medio-ink)"],
  ALTO: ["var(--lv-alto)", "var(--lv-alto-ink)"], MUY_ALTO: ["var(--lv-muyalto)", "var(--lv-muyalto-ink)"],
};
const STATUS: Record<string, [string, string]> = {
  BORRADOR: ["Borrador", "bg-gray-100 text-gray-700"], ABIERTA: ["Abierta · recibiendo respuestas", "bg-green-100 text-green-700"], CERRADA: ["Cerrada", "bg-gray-100 text-gray-700"],
};

const ic = (d: React.ReactNode) => <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{d}</svg>;
const ICONS = {
  evaluacion: ic(<><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></>),
  tablero: ic(<><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>),
  informe: ic(<><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 14h6M9 17h4" /></>),
  programa: ic(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18M8 14h3M8 17h6" /></>),
  gestion: ic(<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><path d="M8 9h8M8 13h5" /></>),
  guia1: ic(<><path d="M12 21s-7-4.5-7-11a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 6.5-7 11-7 11z" /><path d="M12 10v3M12 16h.01" /></>),
};

export type EvalCardData = {
  id: string; name: string; guide: "GUIA_II" | "GUIA_III"; includeGuideI: boolean; status: string; createdAt: Date;
  workplaceId: string; responses: number; target: number | null; level: Level | null; mean: number | null; atsCases: number;
};

/** Tarjeta de una evaluación con acceso directo a sus módulos, en el orden en que se trabajan. */
export default function EvalCard({ ev, canSeeConfidential }: { ev: EvalCardData; canSeeConfidential: boolean }) {
  const base = `/admin/evaluaciones/${ev.id}`;
  const mods: { k: keyof typeof ICONS; title: string; desc: string; href: string }[] = [
    { k: "evaluacion", title: "Evaluación", desc: "Enlace, código QR, estado e importación de Excel", href: base },
    { k: "tablero", title: "Tablero e indicadores", desc: "Resultados, KPIs, filtros y ficha por reactivo", href: `${base}/indicadores` },
    { k: "informe", title: "Informe PDF", desc: "Documento de resultados listo para entregar", href: `${base}/informe` },
    { k: "programa", title: "Programa de intervención", desc: "Acciones, responsables, fechas y cronograma", href: `${base}/programa` },
    { k: "gestion", title: "Quejas y capacitación", desc: "Buzón, capacitaciones y plantilla por área", href: `/admin/centros/${ev.workplaceId}?ev=${ev.id}` },
    ...(canSeeConfidential ? [{ k: "guia1" as const, title: "Seguimiento Guía I", desc: ev.atsCases ? `${ev.atsCases} ${ev.atsCases === 1 ? "caso requiere" : "casos requieren"} valoración clínica` : "Casos de acontecimientos traumáticos", href: `${base}/confidencial` }] : []),
  ];
  const pct = ev.target ? Math.min(100, Math.round((ev.responses / ev.target) * 100)) : null;
  const [statusLabel, statusCls] = STATUS[ev.status] ?? [ev.status, "bg-gray-100 text-gray-700"];

  return (
    <div className="rounded-xl border border-line bg-surface-2 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={base} className="text-base font-semibold text-ink hover:text-brand-700 hover:underline">{ev.name}</Link>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">{ev.guide === "GUIA_III" ? "Guía III · 72" : "Guía II · 46"}</span>
            {ev.includeGuideI && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">+ Guía I</span>}
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusCls}`}>{statusLabel}</span>
          </div>
          <p className="mt-0.5 text-xs text-gray-500">Creada el {ev.createdAt.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-44">
            <div className="flex justify-between text-xs text-gray-500"><span>Respuestas</span><span className="font-semibold text-ink tabular-nums">{ev.responses}{ev.target ? ` / ${ev.target}` : ""}</span></div>
            {pct !== null && <div className="mt-1 h-1.5 rounded-full bg-gray-200"><div className={`h-1.5 rounded-full ${pct >= 100 ? "bg-green-600" : "bg-brand-600"}`} style={{ width: `${pct}%` }} /></div>}
            {pct !== null && <div className="mt-0.5 text-[11px] text-gray-500">{pct >= 100 ? "Muestra completa" : `${pct}% de la muestra mínima`}</div>}
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Calificación final</div>
            {ev.level && ev.mean !== null ? (
              <div className="mt-0.5 flex items-center justify-end gap-1.5">
                <span className="text-lg font-semibold tabular-nums">{ev.mean.toFixed(1)}</span>
                <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: LV[ev.level][0], color: LV[ev.level][1] }}>{LEVEL_LABEL[ev.level]}</span>
              </div>
            ) : <div className="mt-0.5 text-sm text-gray-400">Sin datos suficientes</div>}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {mods.map((m, i) => (
          <Link key={m.k} href={m.href}
            className="group flex items-start gap-3 rounded-lg border border-line bg-surface p-3 transition hover:border-brand-600 hover:shadow-sm">
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${m.k === "guia1" && ev.atsCases ? "bg-red-50 text-red-700" : "bg-brand-50 text-brand-700"}`}>{ICONS[m.k]}</span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink group-hover:text-brand-700"><span className="mr-1 text-gray-400">{i + 1}.</span>{m.title}</span>
              <span className="block text-xs text-gray-500">{m.desc}</span>
            </span>
            <span className="ml-auto self-center text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" aria-hidden>→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
