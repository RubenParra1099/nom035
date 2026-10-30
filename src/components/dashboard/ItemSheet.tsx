"use client";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ANSWERS, GUIDES, LEVEL_LABEL, type GuideId, type Level } from "@/lib/nom035/guides";
import type { ScoreResult } from "@/lib/nom035/score";
import { INTERVENTIONS } from "@/lib/nom035/interventions";
import { propChange, wilson } from "@/lib/nom035/stats";
import { LEVEL_HEX, LEVEL_TEXT, RISK_HEX, RiskDiverging, RiskLegend, fmt1, pct } from "./charts";

type Rec = { d: Record<string, string>; it: (number | null)[]; f?: string; cli: boolean | null; jefe: boolean | null };
type GuideT = (typeof GUIDES)[GuideId];

/** Puntos de riesgo (0–4) de una respuesta; v es el índice de la opción (0 = Siempre … 4 = Nunca). */
const pts = (g: GuideT, n: number, v: number) => (g.inverse.has(n) ? v : 4 - v);

function stats(g: GuideT, n: number, recs: Rec[]) {
  const counts = [0, 0, 0, 0, 0];
  let answered = 0;
  for (const r of recs) {
    const v = r.it[n - 1];
    if (v === null || v === undefined) continue;
    counts[pts(g, n, v)]++; answered++;
  }
  const sum = counts.reduce((s, c, k) => s + c * k, 0);
  return { counts, answered, mean: answered ? sum / answered : 0, unfavN: counts[3] + counts[4] };
}

export default function ItemSheet({
  guide, item, recs, scores, prevRecs, prevName, dimensions, minGroup, canSeeIndividual, population, rank, context, onClose, onFilter,
}: {
  guide: GuideId; item: number; recs: Rec[]; scores: ScoreResult[]; prevRecs?: Rec[]; prevName?: string;
  dimensions: { key: string; label: string }[]; minGroup: number; canSeeIndividual: boolean; population: number | null;
  rank: { pos: number; of: number }; context: { title: string; filters: string }; onClose: () => void; onFilter: (key: string, value: string) => void;
}) {
  const g = GUIDES[guide];
  const n = item;
  const domain = Object.entries(g.domains).find(([, its]) => its.includes(n))?.[0] ?? "";
  const category = Object.entries(g.categories).find(([, ds]) => ds.includes(domain))?.[0] ?? "";
  const section = g.sections.find((s) => s.items.includes(n));
  const conditional = g.clientItems.includes(n) ? "Solo quienes atienden clientes o usuarios" : g.bossItems.includes(n) ? "Solo quienes son jefes de otros trabajadores" : null;
  const s = useMemo(() => stats(g, n, recs), [g, n, recs]);
  const ci = wilson(s.unfavN, s.answered, population ?? undefined);
  const prev = prevRecs ? stats(g, n, prevRecs) : null;
  const change = prev && prev.answered >= minGroup ? propChange(s.unfavN, s.answered, prev.unfavN, prev.answered) : null;
  const iv = INTERVENTIONS[domain];

  // Relación con la calificación final: ¿quienes contestan desfavorable están en riesgo alto?
  const hiOf = (sel: (v: number) => boolean) => {
    let t = 0, h = 0;
    recs.forEach((r, i) => {
      const v = r.it[n - 1];
      if (v === null || v === undefined || !sel(pts(g, n, v))) return;
      t++; if (scores[i].finalLevel === "ALTO" || scores[i].finalLevel === "MUY_ALTO") h++;
    });
    return { t, h, p: pct(h, t) };
  };
  const hiUnfav = hiOf((p) => p >= 3), hiRest = hiOf((p) => p < 3);

  const [dim, setDim] = useState(dimensions[0]?.key ?? "departamento");
  const groups = useMemo(() => {
    const by = new Map<string, Rec[]>();
    for (const r of recs) { const k = r.d[dim] ?? "Sin dato"; by.set(k, [...(by.get(k) ?? []), r]); }
    return [...by.entries()].map(([k, rs]) => ({ k, total: rs.length, ...stats(g, n, rs) })).filter((x) => x.answered > 0).sort((a, b) => b.mean - a.mean);
  }, [recs, dim, g, n]);

  const [onlyUnfav, setOnlyUnfav] = useState(true);
  const [area, setArea] = useState("");
  const people = useMemo(() => recs.map((r, i) => ({ r, sc: scores[i], v: r.it[n - 1] }))
    .filter((x) => x.v !== null && x.v !== undefined)
    .map((x) => ({ ...x, p: pts(g, n, x.v as number) }))
    .filter((x) => (!onlyUnfav || x.p >= 3) && (!area || x.r.d.departamento === area))
    .sort((a, b) => b.p - a.p || (a.r.d.departamento ?? "").localeCompare(b.r.d.departamento ?? "", "es") || b.sc.final - a.sc.final), [recs, scores, n, g, onlyUnfav, area]);
  const areas = useMemo(() => [...new Set(recs.map((r) => r.d.departamento ?? "Sin dato"))].sort((a, b) => a.localeCompare(b, "es")), [recs]);

  const [printIndividual, setPrintIndividual] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // Al imprimir, solo la ficha va a la hoja (el tablero de fondo se oculta con body.print-sheet)
  const printSheet = () => {
    const prevTitle = document.title;
    document.title = `Ficha reactivo ${n} - ${context.title}`;
    document.body.classList.add("print-sheet");
    const done = () => { document.body.classList.remove("print-sheet"); document.title = prevTitle; window.removeEventListener("afterprint", done); };
    window.addEventListener("afterprint", done);
    window.print();
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [onClose]);

  const answerPts = ANSWERS.map((_, v) => pts(g, n, v));
  const countByAnswer = ANSWERS.map((_, v) => s.counts[answerPts[v]]);
  const maxC = Math.max(1, ...countByAnswer);

  if (!mounted) return null;
  return createPortal(
    <div id="item-sheet" className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`Ficha técnica del reactivo ${n}`}>
      <button className="sheet-backdrop absolute inset-0 bg-black/40" aria-label="Cerrar" onClick={onClose} />
      <div className="sheet-panel relative flex h-full w-full max-w-3xl flex-col overflow-hidden bg-bg shadow-2xl">
        <div className="sheet-head border-b border-line bg-surface px-5 py-4">
          <div className="sheet-print-only mb-3 hidden items-end justify-between border-b border-line pb-2 text-[11px] text-gray-600">
            <div><b className="text-gray-900">{context.title}</b>{context.filters && <div>Filtros: {context.filters}</div>}</div>
            <div className="text-right">NOM-035-STPS-2018 · {g.name}<div>Impreso el {new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}</div></div>
          </div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Ficha técnica · Reactivo {n} de {g.items}</p>
              <h2 className="mt-1 text-lg font-semibold leading-snug text-gray-900">{g.text(n)}</h2>
            </div>
            <div className="no-print flex shrink-0 gap-2">
              <button className="btn-secondary px-3 py-1.5" onClick={printSheet} title="Imprimir o guardar como PDF">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2" /><path d="M6 14h12v7H6z" /></svg>
                PDF
              </button>
              <button className="btn-secondary px-3 py-1.5" onClick={onClose} aria-label="Cerrar ficha">✕</button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
            <Chip>{category}</Chip><Chip>{domain}</Chip>
            {section && <Chip muted>{section.title}</Chip>}
            <Chip muted>{g.inverse.has(n) ? "Positivo: Siempre = 0 pts" : "Negativo: Siempre = 4 pts"}</Chip>
            {conditional && <Chip muted>{conditional}</Chip>}
          </div>
        </div>

        <div className="sheet-body flex-1 space-y-4 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Puntos promedio" value={s.mean.toFixed(2)} sub="escala 0 a 4" />
            <Stat label="Respuesta desfavorable" value={`${pct(s.unfavN, s.answered)}%`}
              sub={ci ? (ci[0] === ci[1] ? "censo" : `IC 95%: ${Math.round(ci[0])}–${Math.round(ci[1])}%`) : ""} tone={s.unfavN / (s.answered || 1) >= 0.4 ? "var(--lv-muyalto)" : undefined} />
            <Stat label="Lugar por riesgo" value={`${rank.pos}.º`} sub={`de ${rank.of} reactivos`} />
            <Stat label="Respondieron" value={String(s.answered)} sub={s.answered < recs.length ? `${recs.length - s.answered} no aplica` : "todos"} />
          </div>

          {change && prev && (
            <p className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-gray-700">
              Frente a <b>{prevName}</b>: respuesta desfavorable {pct(prev.unfavN, prev.answered)}% → {pct(s.unfavN, s.answered)}%
              {" "}(<b style={{ color: change.delta > 0 ? "var(--lv-muyalto)" : "var(--lv-bajo)" }}>{change.delta > 0 ? "+" : ""}{fmt1(change.delta)} puntos porcentuales</b>
              {change.significant ? ", cambio estadísticamente significativo" : ", dentro del margen de error"}).
            </p>
          )}

          <Section title="Distribución de respuestas" subtitle="Color según el riesgo que representa cada opción en este reactivo">
            <div className="space-y-1.5">
              {ANSWERS.map((a, v) => (
                <div key={a} className="grid grid-cols-[9.5rem_1fr_5.5rem] items-center gap-2 text-sm">
                  <span className="whitespace-nowrap text-gray-700">{a} <span className="text-[11px] text-gray-400">({answerPts[v]} pts)</span></span>
                  <div className="h-5 rounded bg-gray-100"><div className="h-5 rounded" style={{ width: `${(countByAnswer[v] / maxC) * 100}%`, background: RISK_HEX[answerPts[v]] }} /></div>
                  <span className="text-right tabular-nums text-gray-700">{countByAnswer[v]} · {pct(countByAnswer[v], s.answered)}%</span>
                </div>
              ))}
            </div>
            {hiUnfav.t >= minGroup && hiRest.t >= minGroup && (
              <p className="mt-3 text-xs text-gray-600">
                De quienes respondieron desfavorable, <b>{hiUnfav.p}%</b> tiene calificación final Alto o Muy alto, contra <b>{hiRest.p}%</b> del resto.
                {hiUnfav.p - hiRest.p >= 20 ? " Este reactivo distingue bien a los trabajadores en riesgo." : ""}
              </p>
            )}
          </Section>

          <Section title="Por grupo" subtitle={`Grupos con menos de ${minGroup} respuestas se ocultan para proteger la confidencialidad`}
            right={<select className="input w-auto py-1 text-xs" value={dim} onChange={(e) => setDim(e.target.value)}>{dimensions.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}</select>}>
            <div className="mb-2"><RiskLegend /></div>
            <table className="w-full">
              <thead className="border-b border-line"><tr><th className="th">{dimensions.find((d) => d.key === dim)?.label}</th><th className="th text-right">n</th><th className="th w-[38%]">Respuestas</th><th className="th text-right">Desfav.</th><th className="th text-right">Pts.</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {groups.map((x) => x.answered < minGroup ? (
                  <tr key={x.k} className="text-gray-400"><td className="td">{x.k}</td><td className="td text-right tabular-nums">{x.answered}</td><td className="td text-xs" colSpan={3}>Grupo pequeño: datos ocultos</td></tr>
                ) : (
                  <tr key={x.k}>
                    <td className="td">
                      <button className="text-left text-gray-900 hover:text-brand-700 hover:underline" title="Filtrar el tablero por este grupo" onClick={() => onFilter(dim, x.k)}>{x.k}</button>
                    </td>
                    <td className="td text-right tabular-nums text-gray-500">{x.answered}</td>
                    <td className="td"><RiskDiverging counts={x.counts} label={x.k} /></td>
                    <td className="td text-right tabular-nums">{pct(x.unfavN, x.answered)}%</td>
                    <td className="td text-right font-semibold tabular-nums">{x.mean.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section title="Respuestas individuales" subtitle="Anónimas: la plataforma no guarda nombres. El folio identifica la encuesta, no a la persona"
            className={canSeeIndividual && printIndividual ? "" : "print:hidden"}>
            {canSeeIndividual ? (
              <>
                <div className="mb-2 flex flex-wrap items-center gap-3 text-sm">
                  <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={onlyUnfav} onChange={(e) => setOnlyUnfav(e.target.checked)} />Solo respuestas desfavorables</label>
                  <select className="input w-auto py-1 text-xs" value={area} onChange={(e) => setArea(e.target.value)}>
                    <option value="">Todas las áreas</option>{areas.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <span className="text-gray-500">{people.length} encuestas</span>
                  <label className="no-print ml-auto inline-flex items-center gap-1.5 text-xs text-gray-600"><input type="checkbox" checked={printIndividual} onChange={(e) => setPrintIndividual(e.target.checked)} />Incluir en el PDF</label>
                </div>
                <div className="max-h-[22rem] overflow-auto rounded-lg border border-line print:max-h-none print:overflow-visible">
                  <table className="w-full min-w-[560px]">
                    <thead className="sticky top-0 bg-surface-2"><tr>
                      <th className="th">Folio</th><th className="th">Área y puesto</th><th className="th">Sexo</th><th className="th">Antigüedad</th><th className="th">Respuesta</th><th className="th">Calif. final</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {people.map(({ r, sc, v, p }, i) => (
                        <tr key={r.f ?? i}>
                          <td className="td font-mono text-xs text-gray-500">{r.f ?? "—"}</td>
                          <td className="td"><div>{r.d.departamento}</div><div className="text-[11px] text-gray-500">{r.d.puesto}</div></td>
                          <td className="td text-gray-700">{r.d.sexo}</td>
                          <td className="td text-xs text-gray-600">{r.d.tiempoPuesto}</td>
                          <td className="td"><span className="inline-flex items-center gap-1.5 whitespace-nowrap"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: RISK_HEX[p] }} />{ANSWERS[v as number]}</span></td>
                          <td className="td"><LevelPill level={sc.finalLevel} score={sc.final} /></td>
                        </tr>
                      ))}
                      {!people.length && <tr><td className="td text-center text-gray-500" colSpan={6}>Sin respuestas con este filtro.</td></tr>}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-[11px] text-gray-500">
                  Visible solo para administradores y consultores. Usa este detalle para orientar la intervención en el área, no para identificar o sancionar
                  a trabajadores; si se percibe que las respuestas no son anónimas, las siguientes evaluaciones pierden confiabilidad.
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-600">Por confidencialidad, el detalle por encuesta solo lo ve el consultor. Aquí tienes el resultado agrupado por área y demás datos sociodemográficos.</p>
            )}
          </Section>

          {iv && (
            <Section title="Acciones sugeridas" subtitle={`${domain} · ${iv.level} de intervención`}>
              <p className="mb-2 text-sm text-gray-700">{iv.focus}</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">{iv.actions.map((a) => <li key={a}>{a}</li>)}</ul>
            </Section>
          )}
        </div>
      </div>
    </div>
  , document.body);
}

function Chip({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return <span className={`rounded-full px-2 py-0.5 font-medium ${muted ? "bg-gray-100 text-gray-600" : "bg-brand-50 text-brand-700"}`}>{children}</span>;
}
function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="card p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-0.5 text-2xl font-semibold tabular-nums text-gray-900" style={tone ? { color: tone } : undefined}>{value}</p>
      {sub && <p className="text-[11px] text-gray-500">{sub}</p>}
    </div>
  );
}
function Section({ title, subtitle, right, children, className = "" }: { title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`card p-4 ${className}`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div><h3 className="text-sm font-semibold text-gray-900">{title}</h3>{subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}</div>
        {right}
      </div>
      {children}
    </section>
  );
}
function LevelPill({ level, score }: { level: Level; score: number }) {
  return <span className="inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: LEVEL_HEX[level], color: LEVEL_TEXT[level] }}>{LEVEL_LABEL[level]} · {score}</span>;
}
