"use client";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { LEVELS, LEVEL_LABEL, type Level } from "@/lib/nom035/guides";

/* ---------- Colores ---------- */
export const LEVEL_HEX: Record<Level, string> = {
  NULO: "var(--lv-nulo)", BAJO: "var(--lv-bajo)", MEDIO: "var(--lv-medio)", ALTO: "var(--lv-alto)", MUY_ALTO: "var(--lv-muyalto)",
};
export const LEVEL_TEXT: Record<Level, string> = {
  NULO: "var(--lv-nulo-ink)", BAJO: "var(--lv-bajo-ink)", MEDIO: "var(--lv-medio-ink)", ALTO: "var(--lv-alto-ink)", MUY_ALTO: "var(--lv-muyalto-ink)",
};
/** Respuestas por riesgo (0 = sin riesgo … 4 = máximo riesgo): escala divergente, distinta del semáforo. */
export const RISK_HEX = ["var(--risk-0)", "var(--risk-1)", "var(--risk-2)", "var(--risk-3)", "var(--risk-4)"];
export const RISK_LABEL = ["Sin riesgo (0)", "Riesgo bajo (1)", "Intermedio (2)", "Riesgo alto (3)", "Máximo riesgo (4)"];

type Cuts = readonly [number, number, number, number];
export function levelOf(v: number, cuts: Cuts): Level {
  let i = 0;
  for (const c of cuts) if (v >= c) i++;
  return LEVELS[i];
}
/** Índice 0–5: nivel + fracción dentro de su banda. Permite comparar dominios con escalas distintas. */
export function riskIndex(v: number, cuts: Cuts, max: number) {
  const edges = [0, ...cuts, Math.max(max, cuts[3] + 1)];
  for (let i = 0; i < 5; i++) {
    if (v < edges[i + 1] || i === 4) return Math.min(5, i + Math.max(0, (v - edges[i]) / (edges[i + 1] - edges[i])));
  }
  return 5;
}
export const fmt1 = (n: number) => n.toLocaleString("es-MX", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

/* ---------- Tooltip compartido ---------- */
type TipCtx = { show: (e: React.MouseEvent, node: React.ReactNode) => void; hide: () => void };
const Ctx = createContext<TipCtx>({ show: () => {}, hide: () => {} });
export function TipProvider({ children }: { children: React.ReactNode }) {
  const [tip, setTip] = useState<{ x: number; y: number; node: React.ReactNode } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const show = useCallback((e: React.MouseEvent, node: React.ReactNode) => setTip({ x: e.clientX, y: e.clientY, node }), []);
  const hide = useCallback(() => setTip(null), []);
  const w = typeof window !== "undefined" ? window.innerWidth : 1200;
  return (
    <Ctx.Provider value={{ show, hide }}>
      {children}
      {tip && (
        <div ref={ref} role="tooltip"
          className="pointer-events-none fixed z-50 max-w-xs rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink shadow-lg"
          style={{ left: Math.min(tip.x + 14, w - 300), top: tip.y + 14 }}>
          {tip.node}
        </div>
      )}
    </Ctx.Provider>
  );
}
export const useTip = () => useContext(Ctx);

/* ---------- Medidor (calificación final) ---------- */
export function Gauge({ value, cuts, max, prev }: { value: number; cuts: Cuts; max: number; prev?: number }) {
  const { show, hide } = useTip();
  const W = 260, R = 100, cx = 130, cy = 118, th = 22;
  const top = Math.max(max, cuts[3] * 1.35);
  const ang = (v: number) => Math.PI * (1 - Math.min(v, top) / top);
  const pt = (v: number, r: number) => [cx + r * Math.cos(ang(v)), cy - r * Math.sin(ang(v))];
  const arc = (a: number, b: number) => {
    const [x1, y1] = pt(a, R), [x2, y2] = pt(b, R), [x3, y3] = pt(b, R - th), [x4, y4] = pt(a, R - th);
    return `M${x1},${y1} A${R},${R} 0 0 1 ${x2},${y2} L${x3},${y3} A${R - th},${R - th} 0 0 0 ${x4},${y4} Z`;
  };
  const edges = [0, ...cuts, top];
  const lvl = levelOf(value, cuts);
  const [nx, ny] = pt(value, R - th - 8);
  return (
    <svg viewBox={`0 0 ${W} 150`} className="w-full max-w-[300px]" role="img" aria-label={`Calificación ${fmt1(value)}, nivel ${LEVEL_LABEL[lvl]}`}>
      {LEVELS.map((l, i) => (
        <path key={l} d={arc(edges[i] + (i ? top * 0.004 : 0), edges[i + 1])} style={{ fill: LEVEL_HEX[l] }} opacity={l === lvl ? 1 : 0.3}
          onMouseMove={(e) => show(e, <><b>{LEVEL_LABEL[l]}</b><br />{i === 0 ? `menor a ${cuts[0]}` : i === 4 ? `${cuts[3]} o más` : `${edges[i]} a < ${edges[i + 1]}`}</>)}
          onMouseLeave={hide} />
      ))}
      {prev !== undefined && (() => { const [a, b] = pt(prev, R + 4), [c, d] = pt(prev, R - th - 4); return <line x1={a} y1={b} x2={c} y2={d} style={{ stroke: "var(--ink)" }} strokeWidth={2} strokeDasharray="3 2" />; })()}
      <line x1={cx} y1={cy} x2={nx} y2={ny} style={{ stroke: "var(--ink)" }} strokeWidth={3} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={6} style={{ fill: "var(--ink)" }} />
      {cuts.map((c) => { const [x, y] = pt(c, R + 10); return <text key={c} x={x} y={y} fontSize={9} textAnchor="middle" style={{ fill: "var(--muted)" }}>{c}</text>; })}
      <text x={cx} y={cy + 28} textAnchor="middle" fontSize={22} fontWeight={700} style={{ fill: "var(--ink)" }}>{fmt1(value)}</text>
    </svg>
  );
}

/* ---------- Dona (distribución por nivel) ---------- */
export function LevelDonut({ dist, total, label }: { dist: Record<Level, number>; total: number; label: string }) {
  const { show, hide } = useTip();
  const R = 62, r = 40, c = 80;
  let a0 = -Math.PI / 2;
  const segs = LEVELS.filter((l) => dist[l] > 0).map((l) => {
    const a1 = a0 + (dist[l] / total) * Math.PI * 2;
    const gap = 0.012;
    const s = a0 + gap, e = Math.max(a1 - gap, s + 0.001), large = e - s > Math.PI ? 1 : 0;
    const p = (ang: number, rad: number) => `${c + rad * Math.cos(ang)},${c + rad * Math.sin(ang)}`;
    const d = `M${p(s, R)} A${R},${R} 0 ${large} 1 ${p(e, R)} L${p(e, r)} A${r},${r} 0 ${large} 0 ${p(s, r)} Z`;
    a0 = a1;
    return { l, d };
  });
  const hi = dist.ALTO + dist.MUY_ALTO;
  return (
    <div className="flex flex-wrap items-center gap-4">
      <svg viewBox="0 0 160 160" className="h-40 w-40 shrink-0" role="img" aria-label={label}>
        {segs.length === 1 ? <circle cx={c} cy={c} r={(R + r) / 2} fill="none" style={{ stroke: LEVEL_HEX[segs[0].l] }} strokeWidth={R - r} /> :
          segs.map(({ l, d }) => (
            <path key={l} d={d} style={{ fill: LEVEL_HEX[l] }} onMouseMove={(e) => show(e, <><b>{LEVEL_LABEL[l]}</b>: {dist[l]} trabajadores ({pct(dist[l], total)}%)</>)} onMouseLeave={hide} />
          ))}
        <text x={c} y={c - 2} textAnchor="middle" fontSize={22} fontWeight={700} style={{ fill: "var(--ink)" }}>{pct(hi, total)}%</text>
        <text x={c} y={c + 14} textAnchor="middle" fontSize={9} style={{ fill: "var(--muted)" }}>alto + muy alto</text>
      </svg>
      <ul className="space-y-1 text-sm">
        {LEVELS.map((l) => (
          <li key={l} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm" style={{ background: LEVEL_HEX[l] }} />
            <span className="w-32 text-gray-700">{LEVEL_LABEL[l]}</span>
            <b className="tabular-nums">{dist[l]}</b>
            <span className="text-gray-400 tabular-nums">{pct(dist[l], total)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Barra con bandas de nivel (bullet) ---------- */
export function BulletBar({ value, cuts, max, prev, label }: { value: number; cuts: Cuts; max: number; prev?: number; label: string }) {
  const { show, hide } = useTip();
  const top = Math.max(max, cuts[3] * 1.2);
  const x = (v: number) => `${(Math.min(v, top) / top) * 100}%`;
  const edges = [0, ...cuts, top];
  const lvl = levelOf(value, cuts);
  return (
    <div className="relative h-6 w-full"
      onMouseMove={(e) => show(e, <><b>{label}</b><br />Calificación: <b>{fmt1(value)}</b> ({LEVEL_LABEL[lvl]})
        {prev !== undefined && <><br />Periodo anterior: {fmt1(prev)} ({value - prev >= 0 ? "+" : ""}{fmt1(value - prev)})</>}
        <br /><span className="text-gray-500">Rangos: Bajo ≥{cuts[0]} · Medio ≥{cuts[1]} · Alto ≥{cuts[2]} · Muy alto ≥{cuts[3]}</span></>)}
      onMouseLeave={hide}>
      <div className="absolute inset-y-1.5 left-0 right-0 flex gap-[2px] overflow-hidden rounded">
        {LEVELS.map((l, i) => <div key={l} style={{ width: `${((edges[i + 1] - edges[i]) / top) * 100}%`, background: LEVEL_HEX[l], opacity: 0.22 }} />)}
      </div>
      <div className="absolute inset-y-[9px] left-0 rounded-r" style={{ width: x(value), background: LEVEL_HEX[lvl] }} />
      {prev !== undefined && <div className="absolute inset-y-0 w-0.5 bg-gray-900/70" style={{ left: x(prev) }} title="Periodo anterior" />}
    </div>
  );
}

/* ---------- Radar de dominios (índice 0–5) ---------- */
export function Radar({ axes, compare }: { axes: { label: string; value: number; raw: string; level: Level }[]; compare?: number[] }) {
  const { show, hide } = useTip();
  const S = 340, c = S / 2, R = 118, n = axes.length;
  const p = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return [c + (R * v / 5) * Math.cos(a), c + (R * v / 5) * Math.sin(a)];
  };
  const poly = (vals: number[]) => vals.map((v, i) => p(i, v).join(",")).join(" ");
  return (
    <svg viewBox={`-120 -14 ${S + 240} ${S + 28}`} className="mx-auto w-full max-w-[560px]" role="img" aria-label="Radar de dominios">
      {[1, 2, 3, 4, 5].map((k) => <polygon key={k} points={poly(Array(n).fill(k))} fill="none" style={{ stroke: "var(--line)" }} />)}
      {axes.map((_, i) => { const [x, y] = p(i, 5); return <line key={i} x1={c} y1={c} x2={x} y2={y} style={{ stroke: "var(--line)" }} />; })}
      {[1, 2, 3, 4].map((k) => { const [x, y] = p(0, k); return <text key={k} x={x + 3} y={y + 3} fontSize={8} style={{ fill: "var(--faint)" }}>{["Bajo", "Medio", "Alto", "M. alto"][k - 1]}</text>; })}
      {compare && <polygon points={poly(compare)} fill="none" style={{ stroke: "var(--muted)" }} strokeWidth={1.5} strokeDasharray="4 3" />}
      <polygon points={poly(axes.map((a) => a.value))} style={{ fill: "var(--brand)", stroke: "var(--brand)" }} fillOpacity={0.15} strokeWidth={2} />
      {axes.map((a, i) => {
        const [x, y] = p(i, a.value);
        const [lx, ly] = p(i, 5.6);
        const words = a.label.split(" "); const lines: string[] = [];
        for (const w of words) { const l = lines[lines.length - 1]; if (l && (l + " " + w).length <= 20) lines[lines.length - 1] = l + " " + w; else lines.push(w); }
        return (
          <g key={a.label}>
            <circle cx={x} cy={y} r={5} style={{ fill: LEVEL_HEX[a.level], stroke: "var(--surface)" }} strokeWidth={2}
              onMouseMove={(e) => show(e, <><b>{a.label}</b><br />{a.raw} · {LEVEL_LABEL[a.level]}</>)} onMouseLeave={hide} />
            <text x={lx} y={ly - ((lines.length - 1) * 11) / 2} fontSize={10} textAnchor={Math.abs(lx - c) < 10 ? "middle" : lx > c ? "start" : "end"} dominantBaseline="middle" style={{ fill: "var(--ink-2)" }}>
              {lines.map((t, k) => <tspan key={k} x={lx} dy={k ? 11 : 0}>{t}</tspan>)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ---------- Barra 100% por nivel ---------- */
export function LevelStack({ dist, total, height = 12 }: { dist: Record<Level, number>; total: number; height?: number }) {
  const { show, hide } = useTip();
  return (
    <div className="flex w-full gap-[2px] overflow-hidden rounded" style={{ height }}>
      {LEVELS.filter((l) => dist[l] > 0).map((l) => (
        <div key={l} style={{ width: `${(dist[l] / total) * 100}%`, background: LEVEL_HEX[l] }}
          onMouseMove={(e) => show(e, <><b>{LEVEL_LABEL[l]}</b>: {dist[l]} ({pct(dist[l], total)}%)</>)} onMouseLeave={hide} />
      ))}
    </div>
  );
}

/* ---------- Barra divergente de respuestas por riesgo ---------- */
export function RiskDiverging({ counts, label }: { counts: number[]; label: string }) {
  const { show, hide } = useTip();
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  const left = (counts[0] + counts[1] + counts[2] / 2) / total; // proporción a la izquierda del centro
  const segs = counts.map((c, i) => ({ i, w: (c / total) * 50 }));
  return (
    <div className="relative h-4 w-full" onMouseLeave={hide}
      onMouseMove={(e) => show(e, <><b>{label}</b>{counts.map((c, i) => <div key={i} className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-sm" style={{ background: RISK_HEX[i] }} />{RISK_LABEL[i]}: {c} ({pct(c, total)}%)</div>)}</>)}>
      <div className="absolute inset-y-0 left-1/2 w-px bg-gray-400" />
      <div className="absolute inset-y-0 flex gap-[1px]" style={{ left: `${50 - left * 50}%`, width: "50%" }}>
        {segs.map(({ i, w }) => w > 0 && <div key={i} style={{ width: `${w * 2}%`, background: RISK_HEX[i] }} className="first:rounded-l last:rounded-r" />)}
      </div>
    </div>
  );
}
export function RiskLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
      {RISK_LABEL.map((l, i) => <span key={l} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: RISK_HEX[i] }} />{l}</span>)}
    </div>
  );
}

/* ---------- Barras horizontales de frecuencias ---------- */
export function FreqBars({ data, onPick, active }: { data: [string, number][]; onPick?: (k: string) => void; active?: string[] }) {
  const { show, hide } = useTip();
  const max = Math.max(1, ...data.map((d) => d[1]));
  const total = data.reduce((s, d) => s + d[1], 0) || 1;
  return (
    <div className="space-y-1">
      {data.map(([k, v]) => {
        const on = active?.includes(k);
        return (
          <button key={k} type="button" disabled={!onPick} onClick={() => onPick?.(k)}
            className={`grid w-full grid-cols-[minmax(0,9.5rem)_1fr_4.2rem] items-center gap-2 rounded px-1 text-left text-xs ${onPick ? "hover:bg-brand-50" : ""} ${on ? "bg-brand-50 ring-1 ring-brand-600" : ""}`}
            onMouseMove={(e) => show(e, <><b>{k}</b>: {v} ({pct(v, total)}%){onPick && <><br /><span className="text-gray-500">Clic para filtrar</span></>}</>)} onMouseLeave={hide}>
            <span className="truncate py-0.5 text-gray-700">{k}</span>
            <span className="h-2.5 rounded-r bg-gray-100"><span className="block h-full rounded-r bg-brand-600" style={{ width: `${(v / max) * 100}%` }} /></span>
            <span className="text-right tabular-nums text-gray-600">{v} <span className="text-gray-400">{pct(v, total)}%</span></span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Celda de mapa de calor ---------- */
export function HeatCell({ value, level, tip, hidden }: { value?: number; level?: Level; tip?: React.ReactNode; hidden?: boolean }) {
  const { show, hide } = useTip();
  if (hidden || value === undefined || !level) return <td className="px-0.5 py-0.5"><div className="rounded bg-gray-100 px-1 py-1.5 text-center text-[11px] text-gray-400">—</div></td>;
  return (
    <td className="px-0.5 py-0.5">
      <div className="rounded px-1 py-1.5 text-center text-xs font-semibold tabular-nums" style={{ background: LEVEL_HEX[level], color: LEVEL_TEXT[level] }}
        onMouseMove={(e) => tip && show(e, tip)} onMouseLeave={hide}>{fmt1(value)}</div>
    </td>
  );
}
