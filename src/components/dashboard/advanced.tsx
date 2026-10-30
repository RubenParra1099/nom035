"use client";
import { useMemo } from "react";
import { D, LEVEL_LABEL, type GuideDef, type Level } from "@/lib/nom035/guides";
import { aggregate, type ScoreResult } from "@/lib/nom035/score";
import { LEVEL_HEX, fmt1, levelOf, useTip } from "./charts";

const T = { ink: "var(--ink)", ink2: "var(--ink-2)", muted: "var(--muted)", faint: "var(--faint)", line: "var(--line)", surface: "var(--surface)", up: "var(--risk-4)", down: "var(--risk-0)", brand: "var(--brand)" };
const txt = (fill: string = T.muted) => ({ fill });

/* ============ Cascada: qué movió la calificación final entre periodos ============ */
export function Waterfall({ prevName, prevFinal, nowFinal, deltas }: {
  prevName: string; prevFinal: number; nowFinal: number; deltas: { name: string; delta: number }[];
}) {
  const { show, hide } = useTip();
  const steps = [...deltas].filter((d) => Math.abs(d.delta) >= 0.05).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  type Row = { label: string; from: number; to: number; kind: "total" | "up" | "down"; delta?: number };
  const rows: Row[] = [{ label: prevName, from: 0, to: prevFinal, kind: "total" }];
  let acc = prevFinal;
  for (const s of steps) { rows.push({ label: s.name, from: acc, to: acc + s.delta, kind: s.delta > 0 ? "up" : "down", delta: s.delta }); acc += s.delta; }
  rows.push({ label: "Periodo actual", from: 0, to: nowFinal, kind: "total" });
  const vals = rows.flatMap((r) => (r.kind === "total" ? [r.to] : [r.from, r.to]));
  const span = Math.max(...vals) - Math.min(...vals) || 1;
  const step = span > 40 ? 10 : span > 15 ? 5 : span > 6 ? 2 : 1;
  const lo = Math.max(0, Math.floor((Math.min(...vals) - span * 0.6) / step) * step);
  const max = Math.ceil((Math.max(...vals) + span * 0.15) / step) * step;
  for (const r of rows) if (r.kind === "total") r.from = lo;
  const LW = 230, W = 760, rh = 30, H = rows.length * rh + 30;
  const x = (v: number) => LW + ((v - lo) / (max - lo)) * (W - LW - 70);
  const ticks: number[] = []; for (let t = lo; t <= max; t += step * Math.ceil((max - lo) / step / 6)) ticks.push(t);
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[620px]" role="img" aria-label="Cascada de la calificación final entre periodos">
        {ticks.map((t) => <g key={t}><line x1={x(t)} x2={x(t)} y1={0} y2={H - 22} style={{ stroke: T.line }} /><text x={x(t)} y={H - 6} fontSize={10} textAnchor="middle" style={txt()}>{t}</text></g>)}
        {rows.map((r, i) => {
          const y = i * rh + 4, a = Math.min(r.from, r.to), b = Math.max(r.from, r.to);
          const color = r.kind === "total" ? T.ink2 : r.kind === "up" ? T.up : T.down;
          return (
            <g key={r.label + i} onMouseMove={(e) => show(e, r.kind === "total" ? <><b>{r.label}</b>: {fmt1(r.to)} pts</> : <><b>{r.label}</b><br />{r.delta! > 0 ? "Aumentó" : "Redujo"} {fmt1(Math.abs(r.delta!))} pts de riesgo</>)} onMouseLeave={hide}>
              <text x={LW - 10} y={y + 15} fontSize={11.5} textAnchor="end" style={txt(r.kind === "total" ? T.ink : T.ink2)} fontWeight={r.kind === "total" ? 600 : 400}>{r.label.length > 34 ? r.label.slice(0, 33) + "…" : r.label}</text>
              <rect x={x(a)} y={y + 3} width={Math.max(2, x(b) - x(a))} height={rh - 10} rx={3} style={{ fill: color }} opacity={r.kind === "total" ? 0.85 : 1} />
              {i < rows.length - 1 && <line x1={x(r.to)} x2={x(r.to)} y1={y + rh - 7} y2={y + rh + 3} style={{ stroke: T.faint }} strokeDasharray="2 2" />}
              <text x={x(b) + 6} y={y + 15} fontSize={11} style={txt(T.ink)} fontWeight={600}>{r.kind === "total" ? fmt1(r.to) : `${r.delta! > 0 ? "+" : "−"}${fmt1(Math.abs(r.delta!))}`}</text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-600">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: T.up }} />Aumentó el riesgo</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: T.down }} />Redujo el riesgo</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: T.ink2 }} />Calificación final</span>
        <span className="text-gray-400">Eje desde {lo} puntos para que los cambios sean visibles</span>
      </div>
    </div>
  );
}

/* ============ Mapa demanda–control (Karasek) por grupo ============ */
export function DemandControl({ g, groups, minGroup }: { g: GuideDef; groups: { name: string; scores: ScoreResult[] }[]; minGroup: number }) {
  const { show, hide } = useTip();
  const maxC = g.domains[D.CARGA].length * 4, maxK = g.domains[D.CONTROL].length * 4;
  const pts = groups.filter((x) => x.scores.length >= minGroup).map((x) => {
    const a = aggregate(g.id, x.scores);
    const carga = a.domains.find((d) => d.name === D.CARGA)!.mean, control = a.domains.find((d) => d.name === D.CONTROL)!.mean;
    return { name: x.name, n: x.scores.length, x: (carga / maxC) * 100, y: 100 - (control / maxK) * 100, carga, control, level: a.final.level as Level };
  });
  const xCut = (g.domainCuts[D.CARGA][2] / maxC) * 100, yCut = 100 - (g.domainCuts[D.CONTROL][2] / maxK) * 100;
  const W = 560, H = 420, L = 50, R = 16, Tp = 20, B = 46;
  const xs = [...pts.map((p) => p.x), xCut], ys = [...pts.map((p) => p.y), yCut];
  const pad = 12;
  const lo = Math.max(0, Math.floor((Math.min(...xs, ...ys) - pad) / 5) * 5), hi = Math.min(100, Math.ceil((Math.max(...xs, ...ys) + pad) / 5) * 5);
  const sx = (v: number) => L + ((v - lo) / (hi - lo)) * (W - L - R);
  const sy = (v: number) => Tp + (1 - (v - lo) / (hi - lo)) * (H - Tp - B);
  const maxN = Math.max(1, ...pts.map((p) => p.n));
  const quad = [
    { label: "Alta tensión", sub: "mucha carga, poco control", x: (xCut + hi) / 2, y: (lo + yCut) / 2, strong: true },
    { label: "Activo", sub: "mucha carga, buen control", x: (xCut + hi) / 2, y: (yCut + hi) / 2 },
    { label: "Pasivo", sub: "poca carga, poco control", x: (lo + xCut) / 2, y: (lo + yCut) / 2 },
    { label: "Baja tensión", sub: "poca carga, buen control", x: (lo + xCut) / 2, y: (yCut + hi) / 2 },
  ];
  if (!pts.length) return <p className="text-sm text-gray-500">Se requieren grupos con al menos {minGroup} respuestas.</p>;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Mapa demanda-control por grupo">
      <rect x={sx(xCut)} y={sy(yCut)} width={sx(hi) - sx(xCut)} height={sy(lo) - sy(yCut)} style={{ fill: "var(--lv-muyalto)" }} opacity={0.08} />
      {Array.from({ length: Math.floor((hi - lo) / 10) + 1 }, (_, i) => lo + i * 10).map((t) => (
        <g key={t}>
          <line x1={sx(t)} x2={sx(t)} y1={Tp} y2={H - B} style={{ stroke: T.line }} />
          <line x1={L} x2={W - R} y1={sy(t)} y2={sy(t)} style={{ stroke: T.line }} />
          <text x={sx(t)} y={H - B + 16} fontSize={10} textAnchor="middle" style={txt()}>{t}</text>
          <text x={L - 8} y={sy(t) + 3} fontSize={10} textAnchor="end" style={txt()}>{t}</text>
        </g>
      ))}
      <line x1={sx(xCut)} x2={sx(xCut)} y1={Tp} y2={H - B} style={{ stroke: T.faint }} strokeDasharray="5 4" />
      <line x1={L} x2={W - R} y1={sy(yCut)} y2={sy(yCut)} style={{ stroke: T.faint }} strokeDasharray="5 4" />
      {quad.map((q) => (
        <g key={q.label}>
          <text x={sx(q.x)} y={sy(q.y) - 4} fontSize={12} fontWeight={600} textAnchor="middle" style={txt(q.strong ? "var(--lv-muyalto)" : T.faint)}>{q.label}</text>
          <text x={sx(q.x)} y={sy(q.y) + 10} fontSize={9.5} textAnchor="middle" style={txt(T.faint)}>{q.sub}</text>
        </g>
      ))}
      <text x={(L + W - R) / 2} y={H - 8} fontSize={11} textAnchor="middle" style={txt(T.ink2)}>Demanda: carga de trabajo (% del máximo) →</text>
      <text x={14} y={(Tp + H - B) / 2} fontSize={11} textAnchor="middle" transform={`rotate(-90 14 ${(Tp + H - B) / 2})`} style={txt(T.ink2)}>Control y autonomía (favorable %) →</text>
      {(() => {
        // Etiquetas sin encimarse: se apilan verticalmente cuando dos quedan cerca
        const placed: { x: number; y: number }[] = [];
        return pts.sort((a, b) => b.n - a.n).map((p) => {
          const r = 6 + Math.sqrt(p.n / maxN) * 16;
          let ly = sy(p.y) - r - 4;
          while (placed.some((q) => Math.abs(q.x - sx(p.x)) < 80 && Math.abs(q.y - ly) < 12)) ly -= 12;
          placed.push({ x: sx(p.x), y: ly });
          return { p, r, ly };
        });
      })().map(({ p, r, ly }) => {
        return (
          <g key={p.name} onMouseMove={(e) => show(e, <><b>{p.name}</b> · n={p.n}<br />Carga: {fmt1(p.carga)} pts ({fmt1(p.x)}%)<br />Falta de control: {fmt1(p.control)} pts · autonomía {fmt1(p.y)}%<br />Calificación final: {LEVEL_LABEL[p.level]}</>)} onMouseLeave={hide}>
            <circle cx={sx(p.x)} cy={sy(p.y)} r={r} style={{ fill: LEVEL_HEX[p.level], stroke: T.surface }} strokeWidth={2} fillOpacity={0.85} />
            {ly < sy(p.y) - r - 6 && <line x1={sx(p.x)} x2={sx(p.x)} y1={ly + 2} y2={sy(p.y) - r} style={{ stroke: T.faint }} />}
            <text x={sx(p.x)} y={ly} fontSize={10.5} textAnchor="middle" style={txt(T.ink)} fontWeight={600}>{p.name.length > 18 ? p.name.slice(0, 17) + "…" : p.name}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ============ Distribución de calificaciones individuales ============ */
export function FinalHistogram({ g, finals, mean, prevMean }: { g: GuideDef; finals: number[]; mean: number; prevMean?: number }) {
  const { show, hide } = useTip();
  const bin = g.id === "GUIA_III" ? 10 : 5;
  const top = Math.max(g.finalCuts[3] * 1.3, ...finals) + bin;
  const nb = Math.ceil(top / bin);
  const counts = Array.from({ length: nb }, (_, i) => finals.filter((f) => f >= i * bin && f < (i + 1) * bin).length);
  const W = 560, H = 360, L = 34, R = 10, Tp = 18, B = 36;
  const maxC = Math.max(1, ...counts);
  const sx = (v: number) => L + (v / (nb * bin)) * (W - L - R);
  const sy = (c: number) => Tp + (1 - c / maxC) * (H - Tp - B);
  const edges = [0, ...g.finalCuts, nb * bin];
  const levels: Level[] = ["NULO", "BAJO", "MEDIO", "ALTO", "MUY_ALTO"];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Distribución de calificaciones finales">
      {levels.map((l, i) => <rect key={l} x={sx(edges[i])} y={Tp} width={sx(edges[i + 1]) - sx(edges[i])} height={H - Tp - B} style={{ fill: LEVEL_HEX[l] }} opacity={0.09} />)}
      {levels.map((l, i) => <text key={l + "t"} x={(sx(edges[i]) + sx(edges[i + 1])) / 2} y={Tp + 10} fontSize={10.5} textAnchor="middle" style={txt()}>{LEVEL_LABEL[l].split(" ")[0]}</text>)}
      {counts.map((c, i) => c > 0 && (
        <rect key={i} x={sx(i * bin) + 1} y={sy(c)} width={sx(bin) - sx(0) - 2} height={H - B - sy(c)} rx={2}
          style={{ fill: LEVEL_HEX[levelOf(i * bin + bin / 2, g.finalCuts)] }}
          onMouseMove={(e) => show(e, <><b>{i * bin} a {(i + 1) * bin - 1} pts</b>: {c} trabajadores</>)} onMouseLeave={hide} />
      ))}
      <line x1={L} x2={W - R} y1={H - B} y2={H - B} style={{ stroke: T.faint }} />
      {Array.from({ length: Math.floor(nb / 2) + 1 }, (_, i) => i * bin * 2).map((t) => <text key={t} x={sx(t)} y={H - B + 14} fontSize={10} textAnchor="middle" style={txt()}>{t}</text>)}
      <text x={(L + W) / 2} y={H - 4} fontSize={10.5} textAnchor="middle" style={txt(T.ink2)}>Calificación final individual (puntos)</text>
      <line x1={sx(mean)} x2={sx(mean)} y1={Tp} y2={H - B} style={{ stroke: T.ink }} strokeWidth={2} />
      <text x={sx(mean) + (prevMean !== undefined && prevMean > mean ? -4 : 4)} y={Tp + 26} fontSize={11} textAnchor={prevMean !== undefined && prevMean > mean ? "end" : "start"} style={txt(T.ink)} fontWeight={600}>Promedio {fmt1(mean)}</text>
      {prevMean !== undefined && <><line x1={sx(prevMean)} x2={sx(prevMean)} y1={Tp} y2={H - B} style={{ stroke: T.ink2 }} strokeDasharray="4 3" />
        <text x={sx(prevMean) + (prevMean > mean ? 4 : -4)} y={Tp + 42} fontSize={10.5} textAnchor={prevMean > mean ? "start" : "end"} style={txt(T.ink2)}>Anterior {fmt1(prevMean)}</text></>}
    </svg>
  );
}

/* ============ Pareto de reactivos ============ */
export function ItemPareto({ items }: { items: { n: number; text: string; points: number }[] }) {
  const { show, hide } = useTip();
  const total = items.reduce((a, b) => a + b.points, 0) || 1;
  const sorted = [...items].filter((i) => i.points > 0).sort((a, b) => b.points - a.points);
  let cum = 0;
  const rows = sorted.map((it) => { cum += it.points; return { ...it, share: (it.points / total) * 100, cum: (cum / total) * 100 }; });
  const n80 = rows.findIndex((r) => r.cum >= 80) + 1;
  const shown = rows.slice(0, Math.min(rows.length, 30));
  const W = 760, L = 40, R = 12, H1 = 170, gap = 34, H2 = 110, B = 34, H = H1 + gap + H2 + B;
  const bw = (W - L - R) / shown.length;
  const maxS = Math.ceil(Math.max(...shown.map((r) => r.share)) + 0.5);
  const sy1 = (v: number) => 24 + (1 - v / maxS) * (H1 - 24);
  const y2 = H1 + gap, sy2 = (v: number) => y2 + (1 - v / 100) * H2;
  const cx = (i: number) => L + bw * (i + 0.5);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Pareto de reactivos">
        <text x={L} y={4} fontSize={10.5} style={txt(T.ink2)} dominantBaseline="hanging">Aporte de cada reactivo al riesgo total (%)</text>
        {[0, maxS / 2, maxS].map((t) => <g key={t}><line x1={L} x2={W - R} y1={sy1(t)} y2={sy1(t)} style={{ stroke: T.line }} /><text x={L - 6} y={sy1(t) + 3} fontSize={10} textAnchor="end" style={txt()}>{fmt1(t)}</text></g>)}
        {shown.map((r, i) => (
          <g key={r.n} onMouseMove={(e) => show(e, <><b>Reactivo {r.n}</b>: {r.text}<br />{fmt1(r.share)}% del riesgo total · acumulado {fmt1(r.cum)}%</>)} onMouseLeave={hide}>
            <rect x={L + bw * i + 1.5} y={sy1(r.share)} width={bw - 3} height={H1 - sy1(r.share)} rx={2} style={{ fill: i < n80 ? T.up : T.faint }} />
          </g>
        ))}
        <text x={L} y={y2 - 22} fontSize={10.5} style={txt(T.ink2)} dominantBaseline="hanging">Acumulado (%)</text>
        {[0, 50, 80, 100].map((t) => <g key={t}><line x1={L} x2={W - R} y1={sy2(t)} y2={sy2(t)} style={{ stroke: t === 80 ? "var(--lv-muyalto)" : T.line }} strokeDasharray={t === 80 ? "5 4" : undefined} /><text x={L - 6} y={sy2(t) + 3} fontSize={10} textAnchor="end" style={txt(t === 80 ? "var(--lv-muyalto)" : T.muted)}>{t}%</text></g>)}
        <polyline points={shown.map((r, i) => `${cx(i)},${sy2(r.cum)}`).join(" ")} fill="none" style={{ stroke: T.ink }} strokeWidth={2} />
        {shown.map((r, i) => <circle key={r.n} cx={cx(i)} cy={sy2(r.cum)} r={2.5} style={{ fill: i < n80 ? T.up : T.ink }} />)}
        {shown.map((r, i) => <text key={"l" + r.n} x={cx(i)} y={H - B + 14} fontSize={10} textAnchor="middle" style={txt()}>{r.n}</text>)}
        <text x={(L + W) / 2} y={H - 4} fontSize={10.5} textAnchor="middle" style={txt(T.ink2)}>Número de reactivo (los {shown.length} que más aportan)</text>
      </svg>
      <p className="mt-1 text-sm text-gray-600">
        <b className="text-ink">{n80} de {items.length} reactivos</b> concentran el 80% de los puntos de riesgo.{" "}
        {n80 / items.length > 0.45 ? "El riesgo está repartido en muchos reactivos: conviene atacar los dominios completos más que reactivos aislados." : "El riesgo está concentrado: atender esos reactivos tiene el mayor efecto."}
      </p>
    </div>
  );
}

/* ============ Matriz de correlación entre dominios ============ */
function pearson(a: number[], b: number[]) {
  const n = a.length; if (n < 3) return 0;
  const ma = a.reduce((s, v) => s + v, 0) / n, mb = b.reduce((s, v) => s + v, 0) / n;
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; }
  return saa && sbb ? sab / Math.sqrt(saa * sbb) : 0;
}
export function CorrelationMatrix({ g, scores }: { g: GuideDef; scores: ScoreResult[] }) {
  const { show, hide } = useTip();
  const doms = Object.keys(g.domains);
  const m = useMemo(() => doms.map((a) => doms.map((b) => pearson(scores.map((s) => s.domains[a]), scores.map((s) => s.domains[b])))), [scores, doms]);
  const color = (r: number) => r >= 0 ? `color-mix(in oklab, var(--risk-4) ${Math.round(Math.min(1, r) * 100)}%, var(--surface))` : `color-mix(in oklab, var(--risk-0) ${Math.round(Math.min(1, -r) * 100)}%, var(--surface))`;
  const short = (d: string) => d.replace("Condiciones en el ambiente de trabajo", "Condiciones").replace("Falta de control sobre el trabajo", "Falta de control").replace("Interferencia en la relación trabajo-familia", "Interferencia T-F").replace("Insuficiente sentido de pertenencia e inestabilidad", "Pertenencia").replace("Reconocimiento del desempeño", "Reconocimiento").replace("Relaciones en el trabajo", "Relaciones").replace("Jornada de trabajo", "Jornada").replace("Carga de trabajo", "Carga");
  const pairs = doms.flatMap((a, i) => doms.slice(i + 1).map((b, k) => ({ a, b, r: m[i][i + 1 + k] }))).sort((x, y) => y.r - x.r).slice(0, 3);
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-[2px] text-xs">
          <thead><tr><th />{doms.map((d) => <th key={d} className="h-24 w-12 align-bottom font-medium text-gray-600"><div className="mx-auto w-4 rotate-180 whitespace-nowrap [writing-mode:vertical-rl]">{short(d)}</div></th>)}</tr></thead>
          <tbody>
            {doms.map((a, i) => (
              <tr key={a}>
                <th className="whitespace-nowrap pr-2 text-right font-medium text-gray-600">{short(a)}</th>
                {doms.map((b, j) => (
                  <td key={b} className="h-10 w-12 rounded text-center tabular-nums" style={{ background: i === j ? "var(--surface-2)" : color(m[i][j]), color: "var(--ink)" }}
                    onMouseMove={(e) => i !== j && show(e, <><b>{a}</b> ↔ <b>{b}</b><br />r = {m[i][j].toFixed(2)} · {Math.abs(m[i][j]) >= 0.5 ? "relación fuerte" : Math.abs(m[i][j]) >= 0.3 ? "relación moderada" : "relación débil"}</>)} onMouseLeave={hide}>
                    {i === j ? "" : m[i][j].toFixed(2)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-gray-600">Relaciones más fuertes: {pairs.map((p) => `${short(p.a)} ↔ ${short(p.b)} (r = ${p.r.toFixed(2)})`).join(" · ")}. Dominios muy relacionados conviene atenderlos con acciones conjuntas.</p>
    </div>
  );
}

/* ============ Embudo de casos de Guía I ============ */
export function AtsFunnel({ ats }: { ats: { status: string; canalizedAt: string | null }[] }) {
  const { show, hide } = useTip();
  const total = ats.length;
  const stages = [
    { label: "Identificados", n: total, note: "Requieren valoración clínica" },
    { label: "Canalizados", n: ats.filter((a) => a.canalizedAt || ["CANALIZADO", "EN_ATENCION", "ATENDIDO"].includes(a.status)).length, note: "Enviados a atención médica o psicológica" },
    { label: "En atención o atendidos", n: ats.filter((a) => ["EN_ATENCION", "ATENDIDO"].includes(a.status)).length, note: "Con atención en curso o concluida" },
    { label: "Atendidos", n: ats.filter((a) => a.status === "ATENDIDO").length, note: "Atención concluida" },
  ];
  if (!total) return <p className="text-sm text-gray-500">Sin casos que requieran valoración clínica.</p>;
  return (
    <div className="space-y-2">
      {stages.map((s, i) => {
        const w = (s.n / total) * 100, prev = i ? stages[i - 1].n : s.n;
        return (
          <div key={s.label} className="grid grid-cols-[11rem_1fr_7rem] items-center gap-3 text-sm" onMouseMove={(e) => show(e, <><b>{s.label}</b>: {s.n} de {total}<br />{s.note}</>)} onMouseLeave={hide}>
            <span className="text-gray-700">{s.label}</span>
            <span className="flex justify-center"><span className="block h-8 rounded" style={{ width: `${Math.max(w, 2)}%`, background: i === 0 ? "var(--lv-muyalto)" : `color-mix(in oklab, var(--risk-0) ${40 + i * 20}%, var(--surface))` }} /></span>
            <span className="tabular-nums"><b className="text-ink">{s.n}</b> <span className="text-xs text-gray-500">{Math.round(w)}%{i > 0 && prev > s.n ? ` · −${prev - s.n}` : ""}</span></span>
          </div>
        );
      })}
    </div>
  );
}

/* ============ Mini tendencia (sparkline) ============ */
export function Sparkline({ values, labels, invert = false }: { values: (number | null)[]; labels: string[]; invert?: boolean }) {
  const { show, hide } = useTip();
  const pts = values.map((v, i) => ({ v, i, l: labels[i] })).filter((p) => p.v !== null && Number.isFinite(p.v)) as { v: number; i: number; l: string }[];
  if (pts.length < 2) return null;
  const W = 120, H = 32, min = Math.min(...pts.map((p) => p.v)), max = Math.max(...pts.map((p) => p.v)), span = max - min || 1;
  const sx = (i: number) => 4 + (i / (values.length - 1)) * (W - 8), sy = (v: number) => 4 + (1 - (v - min) / span) * (H - 8);
  const last = pts[pts.length - 1], first = pts[0];
  const better = invert ? last.v > first.v : last.v < first.v;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-8 w-28" role="img" aria-label="Tendencia entre periodos">
      <polyline points={pts.map((p) => `${sx(p.i)},${sy(p.v)}`).join(" ")} fill="none" style={{ stroke: T.faint }} strokeWidth={1.5} />
      {pts.map((p) => (
        <circle key={p.i} cx={sx(p.i)} cy={sy(p.v)} r={p === last ? 3.5 : 2.5} style={{ fill: p === last ? (better ? T.down : T.up) : T.faint }}
          onMouseMove={(e) => show(e, <><b>{p.l}</b>: {fmt1(p.v)}</>)} onMouseLeave={hide} />
      ))}
    </svg>
  );
}
