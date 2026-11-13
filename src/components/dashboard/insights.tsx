"use client";
import * as XLSX from "xlsx";
import { GUIDES, LEVELS, LEVEL_LABEL, levelFor, type GuideId, type Level } from "@/lib/nom035/guides";
import { aggregate, scoreWorker, type ScoreResult } from "@/lib/nom035/score";
import { meanMoe, wilson } from "@/lib/nom035/stats";
import type { Kpi } from "@/lib/nom035/kpis";
import { LEVEL_HEX, fmt1, useTip } from "./charts";

type Rec = { d: Record<string, string>; it: (number | null)[] };
const scoresOf = (guide: GuideId, recs: Rec[]) => recs.map((r) => scoreWorker(guide, Object.fromEntries(r.it.map((v, i) => [i + 1, v]))));
const BAND = (lv: Level) => `color-mix(in srgb, ${LEVEL_HEX[lv]} 16%, transparent)`;

/* ===================== Evolución entre evaluaciones ===================== */
export function Trend({ guide, periods, headcount }: {
  guide: GuideId; headcount: number;
  periods: { name: string; recs: Rec[] }[]; // del más antiguo al actual, ya filtrados
}) {
  const { show, hide } = useTip();
  const g = GUIDES[guide];
  const pts = periods.map((p) => {
    const sc = scoresOf(guide, p.recs);
    const finals = sc.map((s) => s.final);
    const n = finals.length;
    const mean = n ? finals.reduce((a, b) => a + b, 0) / n : 0;
    const moe = meanMoe(finals, headcount || undefined) ?? 0;
    const hi = sc.filter((s) => s.finalLevel === "ALTO" || s.finalLevel === "MUY_ALTO").length;
    return { name: p.name, n, mean, moe, hiPct: n ? (hi / n) * 100 : 0, hiCi: wilson(hi, n, headcount || undefined), level: levelFor(mean, g.finalCuts) };
  }).filter((p) => p.n >= 5);
  if (pts.length < 2) return null;

  const W = 640, H = 230, L = 46, R = 16, T = 14, B = 34;
  const cuts = g.finalCuts;
  const hiY = Math.max(cuts[3] * 1.12, ...pts.map((p) => p.mean + p.moe)) , loY = 0;
  const x = (i: number) => L + 50 + (i * (W - L - R - 110)) / (pts.length - 1);
  const y = (v: number) => T + (1 - (v - loY) / (hiY - loY)) * (H - T - B);
  const edges = [0, ...cuts, hiY];
  const W2 = 300, H2 = 230, B2 = 34, T2 = 14;
  const y2 = (v: number) => T2 + (1 - v / 100) * (H2 - T2 - B2);
  const bw = Math.min(56, (W2 - 40) / pts.length - 14);

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <figure>
        <figcaption className="mb-1 text-xs text-gray-500">Calificación final promedio · bandas: niveles de la norma · línea: margen de error al 95%</figcaption>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Evolución de la calificación final">
          {LEVELS.map((lv, i) => (
            <g key={lv}>
              <rect x={L} width={W - L - R} y={y(Math.min(edges[i + 1], hiY))} height={y(edges[i]) - y(Math.min(edges[i + 1], hiY))} fill={BAND(lv)} />
              <text x={W - R - 4} y={y(Math.min(edges[i + 1], hiY)) + 12} textAnchor="end" fontSize="10" fill="var(--muted)">{LEVEL_LABEL[lv]}</text>
            </g>
          ))}
          {cuts.map((c) => <text key={c} x={L - 6} y={y(c) + 3} textAnchor="end" fontSize="10" fill="var(--muted)">{c}</text>)}
          <polyline fill="none" stroke="var(--ink)" strokeWidth="2" points={pts.map((p, i) => `${x(i)},${y(p.mean)}`).join(" ")} />
          {pts.map((p, i) => (
            <g key={p.name} onMouseMove={(e) => show(e, <><b>{p.name}</b><br />Final {fmt1(p.mean)} ± {fmt1(p.moe)} · {LEVEL_LABEL[p.level]}<br />n = {p.n}</>)} onMouseLeave={hide}>
              <line x1={x(i)} x2={x(i)} y1={y(p.mean + p.moe)} y2={y(Math.max(0, p.mean - p.moe))} stroke="var(--ink)" strokeWidth="1.5" />
              <circle cx={x(i)} cy={y(p.mean)} r="7" fill={LEVEL_HEX[p.level]} stroke="var(--surface)" strokeWidth="2" />
              <text x={x(i)} y={y(p.mean) - 12} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--ink)">{fmt1(p.mean)}</text>
              <text x={x(i)} y={H - 12} textAnchor="middle" fontSize="11" fill="var(--muted)">{p.name}</text>
            </g>
          ))}
        </svg>
      </figure>
      <figure>
        <figcaption className="mb-1 text-xs text-gray-500">% de trabajadores en nivel alto o muy alto</figcaption>
        <svg viewBox={`0 0 ${W2} ${H2}`} className="w-full" role="img" aria-label="Evolución del porcentaje en riesgo alto">
          {[0, 25, 50, 75, 100].map((t) => <g key={t}><line x1="34" x2={W2 - 6} y1={y2(t)} y2={y2(t)} stroke="var(--line)" /><text x="28" y={y2(t) + 3} textAnchor="end" fontSize="10" fill="var(--muted)">{t}%</text></g>)}
          {pts.map((p, i) => {
            const cx = 40 + (i + 0.5) * ((W2 - 46) / pts.length);
            return (
              <g key={p.name} onMouseMove={(e) => show(e, <><b>{p.name}</b><br />{fmt1(p.hiPct)}% en Alto o Muy alto{p.hiCi ? <><br />IC 95%: {fmt1(p.hiCi[0])}–{fmt1(p.hiCi[1])}%</> : null}</>)} onMouseLeave={hide}>
                <rect x={cx - bw / 2} width={bw} y={y2(p.hiPct)} height={y2(0) - y2(p.hiPct)} rx="4" fill={i === pts.length - 1 ? "var(--lv-alto)" : "color-mix(in srgb, var(--lv-alto) 45%, transparent)"} />
                {p.hiCi && <line x1={cx} x2={cx} y1={y2(p.hiCi[1])} y2={y2(p.hiCi[0])} stroke="var(--ink)" strokeWidth="1.25" />}
                <text x={cx} y={y2(p.hiPct) - 6} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--ink)">{Math.round(p.hiPct)}%</text>
                <text x={cx} y={H2 - 12} textAnchor="middle" fontSize="11" fill="var(--muted)">{p.name.length > 16 ? p.name.slice(0, 15) + "…" : p.name}</text>
              </g>
            );
          })}
        </svg>
      </figure>
    </div>
  );
}

/* ===================== Grupos: punto con margen de error + composición por nivel ===================== */
export function GroupForest({ guide, rows, overall, label, onPick }: {
  guide: GuideId; label: string; onPick: (name: string) => void;
  rows: { name: string; n: number; hidden: boolean; scores: ScoreResult[]; population?: number }[];
  overall: number;
}) {
  const { show, hide } = useTip();
  const g = GUIDES[guide];
  const cuts = g.finalCuts;
  const data = rows.map((r) => {
    const finals = r.scores.map((s) => s.final);
    const mean = finals.length ? finals.reduce((a, b) => a + b, 0) / finals.length : 0;
    const moe = meanMoe(finals, r.population) ?? 0;
    const dist = Object.fromEntries(LEVELS.map((lv) => [lv, r.scores.filter((s) => s.finalLevel === lv).length])) as Record<Level, number>;
    return { ...r, mean, moe, dist, level: levelFor(mean, cuts) };
  });
  const vis = data.filter((d) => !d.hidden);
  const max = Math.max(cuts[3] * 1.1, ...vis.map((d) => d.mean + d.moe));
  const X = (v: number) => `${(Math.max(0, Math.min(v, max)) / max) * 100}%`;
  const edges = [0, ...cuts, max];

  return (
    <div>
      <div className="mb-2 grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)_minmax(0,14rem)] gap-4 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        <span>{label}</span><span>Calificación final promedio ± margen de error</span><span>Trabajadores por nivel</span>
      </div>
      <div className="space-y-1">
        {data.map((d) => (
          <button key={d.name} type="button" disabled={d.hidden} onClick={() => onPick(d.name)}
            className="grid w-full grid-cols-[minmax(0,11rem)_minmax(0,1fr)_minmax(0,14rem)] items-center gap-4 rounded-lg px-1 py-1 text-left text-sm hover:bg-gray-50 disabled:cursor-not-allowed"
            onMouseMove={(e) => !d.hidden && show(e, <><b>{d.name}</b> · n = {d.n}<br />Final {fmt1(d.mean)} ± {fmt1(d.moe)} · {LEVEL_LABEL[d.level]}<br />
              {LEVELS.map((lv) => d.dist[lv] ? <span key={lv} className="mr-2 inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm" style={{ background: LEVEL_HEX[lv] }} />{d.dist[lv]}</span> : null)}</>)}
            onMouseLeave={hide}>
            <span className="truncate text-ink">{d.name} <span className="text-xs text-gray-400">n={d.n}</span></span>
            {d.hidden ? <span className="col-span-2 text-xs text-gray-400">Grupo pequeño: datos ocultos</span> : (<>
              <span className="relative block h-7">
                {LEVELS.map((lv, i) => <span key={lv} className="absolute inset-y-0" style={{ left: X(edges[i]), width: `calc(${X(edges[i + 1])} - ${X(edges[i])})`, background: BAND(lv) }} />)}
                <span className="absolute inset-y-0 w-px border-l border-dashed border-gray-700" style={{ left: X(overall) }} />
                <span className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-gray-800" style={{ left: X(d.mean - d.moe), width: `calc(${X(d.mean + d.moe)} - ${X(d.mean - d.moe)})` }} />
                <span className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow" style={{ left: X(d.mean), background: LEVEL_HEX[d.level] }} />
                <span className="absolute -top-0.5 -translate-x-1/2 text-[10.5px] font-semibold tabular-nums text-ink" style={{ left: X(d.mean) }}>{fmt1(d.mean)}</span>
              </span>
              <span className="flex h-4 overflow-hidden rounded">
                {LEVELS.map((lv) => d.dist[lv] ? <span key={lv} style={{ width: `${(d.dist[lv] / d.n) * 100}%`, background: LEVEL_HEX[lv] }} /> : null)}
              </span>
            </>)}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-gray-500">Fondo: rangos de nivel de la norma. Línea punteada: promedio del centro ({fmt1(overall)}). Si las líneas de dos grupos no se traslapan, la diferencia es real y no efecto del muestreo.</p>
    </div>
  );
}

/* ===================== Pirámide de edad por sexo ===================== */
const AGES = ["15-19", "20-24", "25-29", "30-34", "35-39", "40-44", "45-49", "50-54", "55-59", "60-64", "65-69", "70 o más"];
export function AgePyramid({ recs, scores, onPick }: { recs: Rec[]; scores: ScoreResult[]; onPick: (k: string, v: string) => void }) {
  const { show, hide } = useTip();
  const ages = AGES.filter((a) => recs.some((r) => r.d.edad === a)).reverse();
  if (ages.length < 2 || !recs.some((r) => r.d.sexo === "Hombre" || r.d.sexo === "Mujer")) return null;
  const cell = (sexo: string, age: string) => {
    const idx = recs.map((r, i) => (r.d.sexo === sexo && r.d.edad === age ? i : -1)).filter((i) => i >= 0);
    const hi = idx.filter((i) => scores[i].finalLevel === "ALTO" || scores[i].finalLevel === "MUY_ALTO").length;
    return { n: idx.length, hi };
  };
  const all = ages.flatMap((a) => [cell("Hombre", a).n, cell("Mujer", a).n]);
  const max = Math.max(1, ...all) / 0.85;
  const side = (sexo: "Hombre" | "Mujer", age: string, right: boolean) => {
    const c = cell(sexo, age);
    const w = (c.n / max) * 100, wh = (c.hi / max) * 100;
    return (
      <button type="button" className={`relative flex h-5 items-center ${right ? "" : "justify-end"}`} onClick={() => onPick("edad", age)}
        onMouseMove={(e) => show(e, <><b>{sexo} · {age}</b><br />{c.n} trabajadores · {c.hi} en Alto o Muy alto{c.n ? ` (${Math.round((c.hi / c.n) * 100)}%)` : ""}</>)} onMouseLeave={hide}>
        <span className={`absolute inset-y-0 ${right ? "left-0 rounded-r" : "right-0 rounded-l"}`} style={{ width: `${w}%`, background: sexo === "Hombre" ? "color-mix(in srgb, var(--brand) 30%, transparent)" : "color-mix(in srgb, var(--lv-nulo) 35%, transparent)" }} />
        <span className={`absolute inset-y-0 ${right ? "left-0 rounded-r" : "right-0 rounded-l"}`} style={{ width: `${wh}%`, background: "var(--lv-alto)" }} />
        <span className={`relative px-1 text-[11px] tabular-nums text-gray-700 ${right ? "" : ""}`} style={right ? { marginLeft: `calc(${w}% + 2px)` } : { marginRight: `calc(${w}% + 2px)` }}>{c.n || ""}</span>
      </button>
    );
  };
  return (
    <div>
      <div className="mb-1 grid grid-cols-[1fr_4.5rem_1fr] text-xs font-semibold text-gray-600"><span className="text-right">Hombres</span><span /><span>Mujeres</span></div>
      <div className="space-y-0.5">
        {ages.map((a) => (
          <div key={a} className="grid grid-cols-[1fr_4.5rem_1fr] items-center">
            {side("Hombre", a, false)}
            <span className="text-center text-xs tabular-nums text-gray-600">{a}</span>
            {side("Mujer", a, true)}
          </div>
        ))}
      </div>
      <p className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--lv-alto)" }} />En nivel alto o muy alto</span>
        <span>Barra clara: total de trabajadores · clic en una edad para filtrar</span>
      </p>
    </div>
  );
}

/* ===================== Exportar a Excel ===================== */
export function exportDashboard({ guide, name, recs, scores, kpis, dimensions, minGroup, filters }: {
  guide: GuideId; name: string; recs: Rec[]; scores: ScoreResult[]; kpis: Kpi[];
  dimensions: { key: string; label: string }[]; minGroup: number; filters: string;
}) {
  const g = GUIDES[guide];
  const a = aggregate(guide, scores);
  const wb = XLSX.utils.book_new();
  const dist = (d: Record<Level, number>) => LEVELS.map((lv) => d[lv]);
  const head = ["Concepto", "Calificación promedio", "Nivel", ...LEVELS.map((lv) => `${LEVEL_LABEL[lv]} (trab.)`)];
  const res = [
    [`Evaluación: ${name}`], [`Guía: ${g.name}`], [`Filtros: ${filters || "ninguno"}`], [`Respuestas: ${a.n}`], [],
    head,
    ["Calificación final", +a.final.mean.toFixed(2), LEVEL_LABEL[a.final.level], ...dist(a.final.distribution)],
    [], ["Categorías"], head,
    ...a.categories.map((c) => [c.name, +c.mean.toFixed(2), LEVEL_LABEL[c.level], ...dist(c.distribution)]),
    [], ["Dominios"], ["Dominio", "Categoría", "Calificación promedio", "Nivel", ...LEVELS.map((lv) => LEVEL_LABEL[lv])],
    ...a.domains.map((d) => [d.name, d.category, +d.mean.toFixed(2), LEVEL_LABEL[d.level], ...dist(d.distribution)]),
  ];
  const s1 = XLSX.utils.aoa_to_sheet(res); s1["!cols"] = [{ wch: 48 }, { wch: 22 }, { wch: 18 }, ...LEVELS.map(() => ({ wch: 14 }))];
  XLSX.utils.book_append_sheet(wb, s1, "Resumen");

  // Por grupo (cada dato general), respetando el grupo mínimo
  const gr: (string | number)[][] = [["Dato", "Grupo", "n", "Calificación final", "Nivel", "% Alto o Muy alto", ...a.categories.map((c) => c.name)]];
  for (const { key, label } of dimensions) {
    const by: Record<string, ScoreResult[]> = {};
    recs.forEach((r, i) => (by[r.d[key] ?? "Sin dato"] ??= []).push(scores[i]));
    for (const [k, sc] of Object.entries(by)) {
      if (sc.length < minGroup) { gr.push([label, k, sc.length, "Oculto (grupo menor al mínimo)"]); continue; }
      const ag = aggregate(guide, sc);
      gr.push([label, k, sc.length, +ag.final.mean.toFixed(2), LEVEL_LABEL[ag.final.level], +(((ag.final.distribution.ALTO + ag.final.distribution.MUY_ALTO) / sc.length) * 100).toFixed(1), ...ag.categories.map((c) => +c.mean.toFixed(2))]);
    }
  }
  const s2 = XLSX.utils.aoa_to_sheet(gr); s2["!cols"] = [{ wch: 22 }, { wch: 30 }, { wch: 6 }, { wch: 16 }, { wch: 14 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, s2, "Por grupo");

  // Reactivos
  const ANS = ["Siempre", "Casi siempre", "Algunas veces", "Casi nunca", "Nunca"];
  const it: (string | number)[][] = [["#", "Reactivo", "Sentido", ...ANS, "Respuestas", "Puntos promedio (0-4)", "% desfavorable"]];
  for (let n = 1; n <= g.items; n++) {
    const c = [0, 0, 0, 0, 0]; let tot = 0, pts = 0, unf = 0;
    for (const r of recs) { const v = r.it[n - 1]; if (v === null || v === undefined) continue; c[v]++; tot++; const p = g.inverse.has(n) ? v : 4 - v; pts += p; if (p >= 3) unf++; }
    it.push([n, g.text(n), g.inverse.has(n) ? "Positivo" : "Negativo", ...c, tot, tot ? +(pts / tot).toFixed(2) : 0, tot ? +((unf / tot) * 100).toFixed(1) : 0]);
  }
  const s3 = XLSX.utils.aoa_to_sheet(it); s3["!cols"] = [{ wch: 5 }, { wch: 70 }, { wch: 10 }, ...ANS.map(() => ({ wch: 12 })), { wch: 11 }, { wch: 18 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, s3, "Reactivos");

  const kp: (string | number)[][] = [["Clave", "Indicador", "Valor", "Semáforo", "Fórmula", "Umbrales"]];
  for (const k of kpis) kp.push([k.id, k.name, k.display, k.light.replace("_", " ").toLowerCase(), k.formula, k.thresholds]);
  const s4 = XLSX.utils.aoa_to_sheet(kp); s4["!cols"] = [{ wch: 8 }, { wch: 46 }, { wch: 12 }, { wch: 12 }, { wch: 60 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, s4, "KPIs");

  const data = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  const url = URL.createObjectURL(new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const el = document.createElement("a");
  el.href = url; el.download = `Tablero_${name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9 _-]/g, "").trim().replace(/\s+/g, "_") || "evaluacion"}.xlsx`;
  document.body.appendChild(el); el.click(); el.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
