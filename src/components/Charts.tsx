import { LEVELS, LEVEL_LABEL, type Level } from "@/lib/nom035/guides";
import { LEVEL_HEX } from "./Level";

/** Barra apilada de trabajadores por nivel de riesgo (con etiquetas y tooltip; el color nunca va solo). */
export function LevelStack({ dist, total, showLegend = false }: { dist: Record<Level, number>; total: number; showLegend?: boolean }) {
  return (
    <div>
      <div className="flex h-4 w-full gap-[2px] overflow-hidden rounded" role="img"
        aria-label={LEVELS.map((l) => `${LEVEL_LABEL[l]}: ${dist[l]}`).join(", ")}>
        {LEVELS.filter((l) => dist[l] > 0).map((l) => (
          <div key={l} title={`${LEVEL_LABEL[l]}: ${dist[l]} (${Math.round((dist[l] / total) * 100)}%)`}
            style={{ width: `${(dist[l] / total) * 100}%`, background: LEVEL_HEX[l] }} className="first:rounded-l last:rounded-r" />
        ))}
      </div>
      {showLegend && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
          {LEVELS.map((l) => (
            <span key={l} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: LEVEL_HEX[l] }} />
              {LEVEL_LABEL[l]} <b className="text-gray-900">{dist[l]}</b>
              <span className="text-gray-400">({total ? Math.round((dist[l] / total) * 100) : 0}%)</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Escala ordinal de respuestas: un solo tono, de claro (Nunca) a oscuro (Siempre). */
export const ANSWER_HEX = ["#1e3a8a", "#2f5bd3", "#6b8ff0", "#a9c0f7", "#dbe6fd"];
const ANSWER_LABEL = ["Siempre", "Casi siempre", "Algunas veces", "Casi nunca", "Nunca"];

export function AnswerStack({ counts }: { counts: number[] }) {
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  return (
    <div className="flex h-3 w-full min-w-40 gap-[2px] overflow-hidden rounded">
      {counts.map((c, i) => c > 0 && (
        <div key={i} title={`${ANSWER_LABEL[i]}: ${c} (${Math.round((c / total) * 100)}%)`}
          style={{ width: `${(c / total) * 100}%`, background: ANSWER_HEX[i] }} />
      ))}
    </div>
  );
}
export function AnswerLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
      {ANSWER_LABEL.map((l, i) => (
        <span key={l} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: ANSWER_HEX[i] }} />{l}</span>
      ))}
    </div>
  );
}

/** Barras horizontales simples para frecuencias (un solo tono). */
export function FreqBars({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map((e) => e[1]));
  const total = entries.reduce((s, e) => s + e[1], 0) || 1;
  return (
    <div className="space-y-1.5">
      {entries.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[minmax(0,10rem)_1fr_3.5rem] items-center gap-2 text-xs" title={`${k}: ${v}`}>
          <span className="truncate text-gray-700">{k}</span>
          <div className="h-2.5 rounded-r bg-gray-100"><div className="h-full rounded-r bg-brand-600" style={{ width: `${(v / max) * 100}%` }} /></div>
          <span className="text-right tabular-nums text-gray-600">{v} <span className="text-gray-400">{Math.round((v / total) * 100)}%</span></span>
        </div>
      ))}
    </div>
  );
}
