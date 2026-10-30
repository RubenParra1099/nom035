"use client";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { GUIDES, LEVELS, LEVEL_ACTION, LEVEL_LABEL, itemsOfDomain, type GuideId, type Level } from "@/lib/nom035/guides";
import { aggregate, sampleSize, scoreWorker, type ScoreResult } from "@/lib/nom035/score";
import { INTERVENTIONS, GUIA_I_ACTION } from "@/lib/nom035/interventions";
import { computeKpis, DIM_NAMES, type InterventionData, type Kpi, type Light } from "@/lib/nom035/kpis";
import {
  BulletBar, FreqBars, Gauge, HeatCell, LEVEL_HEX, LEVEL_TEXT, LevelDonut, LevelStack, Radar, RiskDiverging, RiskLegend,
  TipProvider, fmt1, pct, riskIndex, useTip,
} from "./charts";

type Rec = { d: Record<string, string>; it: (number | null)[]; p: Record<string, string>; g1: 0 | 1 | 2; cli: boolean | null; jefe: boolean | null };
type Prev = { id: string; name: string; n: number; final: number; categories: Record<string, number>; domains: Record<string, number> };
type PrevRaw = { id: string; name: string; records: Rec[] };
type Props = {
  evaluation: { id: string; name: string; guide: GuideId; includeGuideI: boolean; company: string; workplace: string; headcount: number };
  records: Rec[];
  previous: PrevRaw[];
  intervention: InterventionData;
  dimensions: { key: string; label: string }[];
  minGroup: number;
  canSeeConfidential: boolean;
};
type Filters = Record<string, string[]>;

const TABS = [
  { id: "resumen", label: "Resumen ejecutivo" },
  { id: "kpis", label: "KPIs y KRIs" },
  { id: "dominios", label: "Categorías y dominios" },
  { id: "grupos", label: "Comparativo por grupos" },
  { id: "reactivos", label: "Reactivos" },
  { id: "guia1", label: "Guía I y entorno físico" },
  { id: "perfil", label: "Perfil de participantes" },
  { id: "plan", label: "Plan de acción" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const PHYS_ORDER = ["Muy Bien", "Bien", "Regular", "Mal", "Muy Mal"];
const PHYS_HEX = ["#0f766e", "#5eada5", "#cbd5e1", "#e9967a", "#b4232a"];
const ORDINAL: Record<string, string[]> = {
  edad: ["15-19", "20-24", "25-29", "30-34", "35-39", "40-44", "45-49", "50-54", "55-59", "60-64", "65-69", "70 o más"],
  tiempoPuesto: ["Menos de 6 meses", "Entre 6 meses y 1 año", "Entre 1 y 4 años", "Entre 5 y 9 años", "Entre 10 y 14 años", "Entre 15 y 19 años", "Entre 20 y 24 años", "25 años o más"],
};
ORDINAL.experiencia = ORDINAL.tiempoPuesto;
const sortVals = (key: string, vals: string[]) =>
  ORDINAL[key] ? [...vals].sort((a, b) => (ORDINAL[key].indexOf(a) + 1 || 99) - (ORDINAL[key].indexOf(b) + 1 || 99)) : [...vals].sort((a, b) => a.localeCompare(b, "es"));

function readUrl(): { f: Filters; tab: TabId } {
  if (typeof window === "undefined") return { f: {}, tab: "resumen" };
  const q = new URLSearchParams(window.location.search);
  const f: Filters = {};
  for (const part of (q.get("f") ?? "").split(";").filter(Boolean)) {
    const [k, v] = part.split(":");
    if (k && v) f[k] = v.split("|").map(decodeURIComponent);
  }
  const tab = (TABS.find((t) => t.id === q.get("tab"))?.id ?? "resumen") as TabId;
  return { f, tab };
}

export default function Dashboard(props: Props) {
  return <TipProvider><DashboardInner {...props} /></TipProvider>;
}

function DashboardInner({ evaluation: ev, records, previous, intervention, dimensions, minGroup, canSeeConfidential }: Props) {
  const g = GUIDES[ev.guide];
  const itemMap = useMemo(() => itemsOfDomain(g), [g]);
  const maxDomain = useMemo(() => Object.fromEntries(Object.entries(g.domains).map(([d, its]) => [d, its.length * 4])), [g]);
  const maxCat = useMemo(() => Object.fromEntries(Object.entries(g.categories).map(([c, ds]) => [c, ds.reduce((s, d) => s + maxDomain[d], 0)])), [g, maxDomain]);
  const scores = useMemo<ScoreResult[]>(() => records.map((r) => scoreWorker(ev.guide, Object.fromEntries(r.it.map((v, i) => [i + 1, v])))), [records, ev.guide]);

  const [filters, setFilters] = useState<Filters>({});
  const [tab, setTab] = useState<TabId>("resumen");
  const [compareId, setCompareId] = useState<string>(previous[0]?.id ?? "");
  useEffect(() => { const u = readUrl(); setFilters(u.f); setTab(u.tab); }, []);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const f = Object.entries(filters).filter(([, v]) => v.length).map(([k, v]) => `${k}:${v.map(encodeURIComponent).join("|")}`).join(";");
    if (f) q.set("f", f); else q.delete("f");
    q.set("tab", tab);
    window.history.replaceState(null, "", `${window.location.pathname}?${q.toString()}`);
  }, [filters, tab]);

  const match = (r: Rec, skip?: string) => Object.entries(filters).every(([k, vs]) => k === skip || !vs.length || vs.includes(r.d[k]));
  const idx = useMemo(() => records.map((r, i) => (match(r) ? i : -1)).filter((i) => i >= 0), [records, filters]); // eslint-disable-line react-hooks/exhaustive-deps
  const fRecs = idx.map((i) => records[i]);
  const fScores = idx.map((i) => scores[i]);
  const n = idx.length;
  const agg = useMemo(() => aggregate(ev.guide, fScores), [ev.guide, idx]); // eslint-disable-line react-hooks/exhaustive-deps
  // Periodo de comparación con los mismos filtros (solo si el grupo comparable tiene el mínimo de respuestas)
  const prev = useMemo<Prev | undefined>(() => {
    const pe = previous.find((p) => p.id === compareId);
    if (!pe) return undefined;
    const rs = pe.records.filter((r) => match(r));
    if (rs.length < minGroup) return undefined;
    const a = aggregate(ev.guide, rs.map((r) => scoreWorker(ev.guide, Object.fromEntries(r.it.map((v, i) => [i + 1, v])))));
    return { id: pe.id, name: pe.name, n: a.n, final: a.final.mean,
      categories: Object.fromEntries(a.categories.map((c) => [c.name, c.mean])), domains: Object.fromEntries(a.domains.map((d) => [d.name, d.mean])) };
  }, [previous, compareId, filters]); // eslint-disable-line react-hooks/exhaustive-deps
  const filtered = Object.values(filters).some((v) => v.length);

  const toggle = (k: string, v: string) =>
    setFilters((f) => { const cur = f[k] ?? []; return { ...f, [k]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] }; });
  const setOnly = (k: string, v: string) => setFilters((f) => ({ ...f, [k]: [v] }));

  const enough = n >= minGroup;

  return (
    <div className="space-y-4">
      <FilterBar dimensions={dimensions} records={records} filters={filters} match={match} toggle={toggle}
        clear={(k) => setFilters((f) => (k ? { ...f, [k]: [] } : {}))} n={n} total={records.length}
        previous={previous} compareId={compareId} setCompareId={setCompareId} />

      <nav className="flex gap-1 overflow-x-auto border-b border-gray-200 print:hidden" role="tablist">
        {TABS.filter((t) => t.id !== "guia1" || ev.includeGuideI || records.some((r) => Object.keys(r.p).length)).map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${tab === t.id ? "border-brand-600 text-brand-700" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
            {t.label}
          </button>
        ))}
      </nav>

      {records.length === 0 ? (
        <Empty>Aún no hay respuestas en esta evaluación.</Empty>
      ) : !enough ? (
        <Empty>La selección tiene {n} {n === 1 ? "respuesta" : "respuestas"}. Para proteger la confidencialidad se requieren al menos {minGroup}. Quita algún filtro.</Empty>
      ) : (
        <>
          {tab === "resumen" && <Resumen {...{ ev, g, agg, n, prev, fRecs, fScores, maxDomain, maxCat, itemMap, setTab, filtered, records }} />}
          {tab === "kpis" && <Kpis kpis={computeKpis({ guide: ev.guide, records: fRecs, minGroup, headcount: ev.headcount, intervention,
            prevRecords: previous.find((p) => p.id === compareId)?.records.filter((r) => match(r)) })} filtered={filtered} hasPrev={!!compareId} />}
          {tab === "dominios" && <Dominios {...{ g, agg, n, prev, maxDomain, maxCat }} />}
          {tab === "grupos" && <Grupos {...{ ev, g, dimensions, fRecs, fScores, minGroup, setOnly, maxDomain }} />}
          {tab === "reactivos" && <Reactivos {...{ g, fRecs, itemMap }} />}
          {tab === "guia1" && <GuiaI {...{ ev, fRecs, dimensions, minGroup, canSeeConfidential }} />}
          {tab === "perfil" && <Perfil {...{ dimensions, fRecs, filters, toggle }} />}
          {tab === "plan" && <Plan {...{ ev, g, agg, n, fRecs, maxDomain }} />}
        </>
      )}
    </div>
  );
}

/* ================= Barra de filtros ================= */
function FilterBar({ dimensions, records, filters, match, toggle, clear, n, total, previous, compareId, setCompareId }: {
  dimensions: { key: string; label: string }[]; records: Rec[]; filters: Filters; match: (r: Rec, skip?: string) => boolean;
  toggle: (k: string, v: string) => void; clear: (k?: string) => void; n: number; total: number;
  previous: PrevRaw[]; compareId: string; setCompareId: (s: string) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const chips = Object.entries(filters).flatMap(([k, vs]) => vs.map((v) => ({ k, v })));
  const usable = dimensions.filter(({ key }) => new Set(records.map((r) => r.d[key])).size > 1);
  return (
    <div ref={ref} className="card z-20 space-y-2 p-3 md:sticky md:top-0 print:static">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Filtros</span>
        {usable.map(({ key, label }) => {
          // Conteos facetados: respetan los demás filtros
          const counts: Record<string, number> = {};
          for (const r of records) if (match(r, key)) counts[r.d[key]] = (counts[r.d[key]] ?? 0) + 1;
          const all = sortVals(key, [...new Set(records.map((r) => r.d[key]))]);
          const sel = filters[key] ?? [];
          return (
            <div key={key} className="relative">
              <button type="button" onClick={() => setOpen(open === key ? null : key)}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm ${sel.length ? "border-brand-600 bg-brand-50 text-brand-700" : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"}`}>
                {label}{sel.length > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-[11px] text-white">{sel.length}</span>}
                <span aria-hidden className="text-gray-400">▾</span>
              </button>
              {open === key && (
                <div className="absolute left-0 z-30 mt-1 max-h-80 w-72 overflow-auto rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
                  {all.map((v) => (
                    <label key={v} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-50">
                      <input type="checkbox" checked={sel.includes(v)} onChange={() => toggle(key, v)} />
                      <span className="flex-1 truncate">{v}</span>
                      <span className="tabular-nums text-xs text-gray-400">{counts[v] ?? 0}</span>
                    </label>
                  ))}
                  {sel.length > 0 && <button className="mt-1 w-full rounded px-2 py-1 text-left text-xs text-brand-700 hover:bg-brand-50" onClick={() => clear(key)}>Quitar este filtro</button>}
                </div>
              )}
            </div>
          );
        })}
        <div className="ml-auto flex flex-wrap items-center gap-3 text-sm">
          {previous.length > 0 && (
            <label className="flex items-center gap-2 text-gray-600">Comparar con
              <select className="rounded-lg border border-gray-300 px-2 py-1 text-sm" value={compareId} onChange={(e) => setCompareId(e.target.value)}>
                <option value="">— ninguno —</option>
                {previous.map((p) => <option key={p.id} value={p.id}>{p.name} (n={p.records.length})</option>)}
              </select>
            </label>
          )}
          <span className="text-gray-600"><b className="tabular-nums text-gray-900">{n}</b> de {total} respuestas</span>
        </div>
      </div>
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map(({ k, v }) => (
            <button key={k + v} onClick={() => toggle(k, v)} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700 hover:bg-gray-200">
              <span className="text-gray-500">{dimensions.find((d) => d.key === k)?.label}:</span> {v} <span aria-hidden>×</span>
            </button>
          ))}
          <button onClick={() => clear()} className="text-xs font-medium text-brand-700 hover:underline">Quitar todos</button>
        </div>
      )}
    </div>
  );
}

/* ================= Utilidades UI ================= */
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="card p-10 text-center text-gray-600">{children}</div>;
}
function Panel({ title, subtitle, right, children, className = "" }: { title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`card p-5 ${className}`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div><h2 className="text-base font-semibold text-gray-900">{title}</h2>{subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}</div>
        {right}
      </div>
      {children}
    </section>
  );
}
function Badge({ level }: { level: Level }) {
  return <span className="inline-flex h-fit shrink-0 self-start whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: LEVEL_HEX[level], color: LEVEL_TEXT[level] }}>{LEVEL_LABEL[level]}</span>;
}
function Delta({ now, before }: { now: number; before?: number }) {
  if (before === undefined) return null;
  const d = now - before;
  const up = d > 0.05, down = d < -0.05;
  return <span className={`whitespace-nowrap text-xs font-medium tabular-nums ${up ? "text-red-600" : down ? "text-green-700" : "text-gray-500"}`} title="Contra el periodo de comparación (más puntos = más riesgo)">{up ? "▲" : down ? "▼" : "="} {fmt1(Math.abs(d))}</span>;
}
function Kpi({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${tone ?? "text-gray-900"}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-gray-500">{sub}</div>}
    </div>
  );
}

type AggT = ReturnType<typeof aggregate>;
type GuideT = (typeof GUIDES)[GuideId];

/* ================= Resumen ================= */
function Resumen({ ev, g, agg, n, prev, fRecs, fScores, maxDomain, itemMap, setTab, filtered, records }: {
  ev: Props["evaluation"]; g: GuideT; agg: AggT; n: number; prev?: Prev; fRecs: Rec[]; fScores: ScoreResult[];
  maxDomain: Record<string, number>; maxCat: Record<string, number>; itemMap: Record<number, { domain: string; category: string }>;
  setTab: (t: TabId) => void; filtered: boolean; records: Rec[];
}) {
  const hi = agg.final.distribution.ALTO + agg.final.distribution.MUY_ALTO;
  const sample = ev.guide === "GUIA_III" ? sampleSize(ev.headcount) : ev.headcount;
  const domRank = [...agg.domains].map((d) => ({ ...d, idx: riskIndex(d.mean, g.domainCuts[d.name], maxDomain[d.name]) })).sort((a, b) => b.idx - a.idx);
  const catRank = [...agg.categories].sort((a, b) => riskIndex(b.mean, g.categoryCuts[b.name], 999) - riskIndex(a.mean, g.categoryCuts[a.name], 999));
  const items = topItems(g, fRecs, itemMap).slice(0, 8);
  const ats = fRecs.filter((r) => r.g1 === 2).length;
  void fScores;

  // Hallazgos automáticos
  const insights: string[] = [];
  insights.push(`La calificación final promedio es ${fmt1(agg.final.mean)} (nivel ${LEVEL_LABEL[agg.final.level].toLowerCase()}); ${pct(hi, n)}% de los trabajadores está en nivel alto o muy alto.`);
  const topD = domRank.filter((d) => d.level === "ALTO" || d.level === "MUY_ALTO");
  if (topD.length) insights.push(`Dominios prioritarios: ${topD.map((d) => `${d.name} (${LEVEL_LABEL[d.level].toLowerCase()})`).join(", ")}.`);
  else insights.push(`Ningún dominio alcanza nivel alto; el de mayor riesgo es ${domRank[0].name} (${LEVEL_LABEL[domRank[0].level].toLowerCase()}).`);
  if (items[0]) insights.push(`El reactivo con más riesgo es el ${items[0].n}: “${items[0].text}” (${items[0].unfav}% de respuestas desfavorables).`);
  if (prev) {
    const d = agg.final.mean - prev.final;
    insights.push(`Contra “${prev.name}”${filtered ? ` (mismo grupo, n=${prev.n})` : ""}, la calificación final ${Math.abs(d) < 0.05 ? "se mantiene" : d > 0 ? `sube ${fmt1(d)} puntos (más riesgo)` : `baja ${fmt1(-d)} puntos (menos riesgo)`}.`);
  }
  if (ev.includeGuideI && ats) insights.push(`${ats} ${ats === 1 ? "trabajador requiere" : "trabajadores requieren"} valoración clínica por acontecimientos traumáticos severos (Guía I).`);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi label="Respuestas analizadas" value={n} sub={filtered ? `de ${records.length} en total` : ev.headcount ? `${pct(records.length, ev.headcount)}% de ${ev.headcount} trabajadores` : undefined} />
        <Kpi label={ev.guide === "GUIA_III" ? "Avance contra la muestra" : "Avance contra plantilla"} value={`${sample ? Math.min(999, pct(records.length, sample)) : 0}%`}
          sub={`${records.length} de ${sample} requeridas`} tone={records.length >= sample ? "text-green-700" : "text-amber-600"} />
        <Kpi label="Nivel alto o muy alto" value={`${pct(hi, n)}%`} sub={`${hi} trabajadores`} tone={pct(hi, n) >= 50 ? "text-red-600" : "text-gray-900"} />
        <Kpi label="Categoría más crítica" value={<span className="text-base">{catRank[0].name}</span>} sub={<Badge level={catRank[0].level} />} />
        {ev.includeGuideI
          ? <Kpi label="Guía I: requieren valoración" value={ats} sub={`${pct(ats, n)}% de la selección`} tone={ats ? "text-red-600" : "text-gray-900"} />
          : <Kpi label="Dominio más crítico" value={<span className="text-base">{domRank[0].name}</span>} sub={<Badge level={domRank[0].level} />} />}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Calificación final del cuestionario" subtitle={prev ? `Línea punteada: ${prev.name}` : "Promedio de las calificaciones individuales"}>
          <div className="flex flex-col items-center">
            <Gauge value={agg.final.mean} cuts={g.finalCuts} max={g.items * 4 * 0.5} prev={prev?.final} />
            <div className="mt-1 flex items-center gap-2"><Badge level={agg.final.level} /><Delta now={agg.final.mean} before={prev?.final} /></div>
            <p className="mt-3 text-xs leading-relaxed text-gray-600">{LEVEL_ACTION[agg.final.level]}</p>
          </div>
        </Panel>
        <Panel title="Trabajadores por nivel de riesgo" subtitle="Calificación final individual">
          <LevelDonut dist={agg.final.distribution} total={n} label="Distribución por nivel" />
        </Panel>
        <Panel title="Hallazgos principales" subtitle="Generados a partir de los datos filtrados">
          <ul className="space-y-2 text-sm text-gray-700">{insights.map((t, i) => <li key={i} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />{t}</li>)}</ul>
          <button className="mt-3 text-sm font-medium text-brand-700 hover:underline" onClick={() => setTab("plan")}>Ver plan de acción →</button>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Categorías" subtitle="Barra: calificación promedio · fondo: rangos de la norma" right={<button className="text-xs text-brand-700 hover:underline" onClick={() => setTab("dominios")}>Detalle →</button>}>
          <div className="space-y-3">
            {agg.categories.map((c) => (
              <div key={c.name}>
                <div className="mb-0.5 flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-gray-800">{c.name}</span>
                  <span className="flex items-center gap-2"><Delta now={c.mean} before={prev?.categories[c.name]} /><b className="tabular-nums">{fmt1(c.mean)}</b><Badge level={c.level} /></span>
                </div>
                <BulletBar value={c.mean} cuts={g.categoryCuts[c.name]} max={0} prev={prev?.categories[c.name]} label={c.name} />
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Perfil de riesgo por dominio" subtitle={`Índice 0–5 (cada anillo es un nivel)${prev ? " · punteado: periodo anterior" : ""}`}>
          <Radar axes={agg.domains.map((d) => ({ label: d.name, value: riskIndex(d.mean, g.domainCuts[d.name], maxDomain[d.name]), raw: `${fmt1(d.mean)} pts`, level: d.level }))}
            compare={prev ? agg.domains.map((d) => riskIndex(prev.domains[d.name] ?? 0, g.domainCuts[d.name], maxDomain[d.name])) : undefined} />
        </Panel>
      </div>

      <Panel title="Reactivos con mayor riesgo" subtitle="Ordenados por puntos promedio · barra: respuestas según su riesgo" right={<RiskLegend />}>
        <ItemRows rows={items} />
        <button className="mt-3 text-sm font-medium text-brand-700 hover:underline" onClick={() => setTab("reactivos")}>Ver los {g.items} reactivos →</button>
      </Panel>
    </div>
  );
}

/* ================= Categorías y dominios ================= */
function Dominios({ g, agg, n, prev, maxDomain }: { g: GuideT; agg: AggT; n: number; prev?: Prev; maxDomain: Record<string, number>; maxCat: Record<string, number> }) {
  return (
    <Panel title="Semáforo por categoría y dominio" subtitle="Calificación promedio, rangos de la norma y distribución de trabajadores por nivel">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead className="border-b border-gray-200"><tr>
            <th className="th">Categoría / dominio</th><th className="th text-right">Calif.</th>{prev && <th className="th text-right">Δ</th>}<th className="th">Nivel</th>
            <th className="th w-[28%]">Posición en los rangos</th><th className="th w-[24%]">Trabajadores por nivel</th><th className="th text-right">Alto+</th>
          </tr></thead>
          <tbody>
            {agg.categories.map((c) => (
              <Fragment key={c.name}>
                <tr className="border-t border-gray-200 bg-gray-50">
                  <td className="td font-semibold">{c.name}</td>
                  <td className="td text-right font-semibold tabular-nums">{fmt1(c.mean)}</td>
                  {prev && <td className="td text-right"><Delta now={c.mean} before={prev.categories[c.name]} /></td>}
                  <td className="td"><Badge level={c.level} /></td>
                  <td className="td"><BulletBar value={c.mean} cuts={g.categoryCuts[c.name]} max={0} prev={prev?.categories[c.name]} label={c.name} /></td>
                  <td className="td"><LevelStack dist={c.distribution} total={n} /></td>
                  <td className="td text-right tabular-nums">{pct(c.distribution.ALTO + c.distribution.MUY_ALTO, n)}%</td>
                </tr>
                {agg.domains.filter((d) => d.category === c.name).map((d) => (
                  <tr key={d.name} className="border-t border-gray-100">
                    <td className="td pl-7 text-gray-700">{d.name}<div className="text-[11px] text-gray-400">Reactivos {g.domains[d.name].slice().sort((a, b) => a - b).join(", ")}</div></td>
                    <td className="td text-right tabular-nums">{fmt1(d.mean)}</td>
                    {prev && <td className="td text-right"><Delta now={d.mean} before={prev.domains[d.name]} /></td>}
                    <td className="td"><Badge level={d.level} /></td>
                    <td className="td"><BulletBar value={d.mean} cuts={g.domainCuts[d.name]} max={maxDomain[d.name]} prev={prev?.domains[d.name]} label={d.name} /></td>
                    <td className="td"><LevelStack dist={d.distribution} total={n} /></td>
                    <td className="td text-right tabular-nums">{pct(d.distribution.ALTO + d.distribution.MUY_ALTO, n)}%</td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">{LEVELS.map((l) => <Badge key={l} level={l} />)}</div>
    </Panel>
  );
}

/* ================= Comparativo por grupos ================= */
function Grupos({ ev, g, dimensions, fRecs, fScores, minGroup, setOnly, maxDomain }: {
  ev: Props["evaluation"]; g: GuideT; dimensions: { key: string; label: string }[]; fRecs: Rec[]; fScores: ScoreResult[];
  minGroup: number; setOnly: (k: string, v: string) => void; maxDomain: Record<string, number>;
}) {
  const usable = dimensions.filter(({ key }) => new Set(fRecs.map((r) => r.d[key])).size > 1);
  const [dim, setDim] = useState(usable[0]?.key ?? "departamento");
  const [level, setLevel] = useState<"categorias" | "dominios">("categorias");
  const [sort, setSort] = useState<"riesgo" | "nombre" | "n">("riesgo");
  const { show, hide } = useTip();
  if (!usable.length) return <Empty>Todos los trabajadores seleccionados comparten los mismos datos generales; no hay grupos que comparar.</Empty>;
  const d = usable.some((u) => u.key === dim) ? dim : usable[0].key;
  const groups: Record<string, ScoreResult[]> = {};
  fRecs.forEach((r, i) => (groups[r.d[d]] ??= []).push(fScores[i]));
  let rows = Object.entries(groups).map(([name, sc]) => ({ name, n: sc.length, hidden: sc.length < minGroup, agg: aggregate(ev.guide, sc) }));
  rows = sort === "nombre" ? rows.sort((a, b) => a.name.localeCompare(b.name, "es")) : sort === "n" ? rows.sort((a, b) => b.n - a.n)
    : rows.sort((a, b) => (a.hidden ? 1 : 0) - (b.hidden ? 1 : 0) || b.agg.final.mean - a.agg.final.mean);
  const cols = level === "categorias" ? Object.keys(g.categories) : Object.keys(g.domains);
  const vis = rows.filter((r) => !r.hidden);
  const maxFinal = Math.max(g.finalCuts[3] * 1.15, ...vis.map((r) => r.agg.final.mean));
  const label = dimensions.find((x) => x.key === d)?.label ?? d;

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <label className="text-sm"><span className="label">Agrupar por</span>
          <select className="input w-56" value={d} onChange={(e) => setDim(e.target.value)}>{usable.map((u) => <option key={u.key} value={u.key}>{u.label}</option>)}</select></label>
        <label className="text-sm"><span className="label">Mostrar</span>
          <select className="input w-44" value={level} onChange={(e) => setLevel(e.target.value as typeof level)}><option value="categorias">Categorías</option><option value="dominios">Dominios</option></select></label>
        <label className="text-sm"><span className="label">Ordenar</span>
          <select className="input w-44" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}><option value="riesgo">Mayor riesgo primero</option><option value="nombre">Alfabético</option><option value="n">Más respuestas</option></select></label>
        <p className="text-xs text-gray-500 md:ml-auto">Grupos con menos de {minGroup} respuestas se ocultan. Clic en un grupo para filtrar todo el tablero.</p>
      </div>

      <Panel title={`Calificación final por ${label.toLowerCase()}`} subtitle="Línea vertical: corte de nivel alto según la norma">
        <div className="space-y-1.5">
          {rows.map((r) => (
            <button key={r.name} type="button" disabled={r.hidden} onClick={() => setOnly(d, r.name)}
              className="grid w-full grid-cols-[minmax(0,12rem)_1fr_7rem] items-center gap-3 rounded px-1 py-0.5 text-left text-sm hover:bg-gray-50 disabled:cursor-not-allowed"
              onMouseMove={(e) => !r.hidden && show(e, <><b>{r.name}</b> · n={r.n}<br />Final {fmt1(r.agg.final.mean)} ({LEVEL_LABEL[r.agg.final.level]})<br />Alto+: {pct(r.agg.final.distribution.ALTO + r.agg.final.distribution.MUY_ALTO, r.n)}%</>)} onMouseLeave={hide}>
              <span className="truncate text-gray-800">{r.name} <span className="text-xs text-gray-400">n={r.n}</span></span>
              {r.hidden ? <span className="text-xs text-gray-400">Grupo pequeño — oculto</span> : (
                <span className="relative block h-5">
                  <span className="absolute inset-y-0 left-0 rounded-r" style={{ width: `${(r.agg.final.mean / maxFinal) * 100}%`, background: LEVEL_HEX[r.agg.final.level] }} />
                  <span className="absolute inset-y-[-3px] w-px bg-gray-800" style={{ left: `${(g.finalCuts[2] / maxFinal) * 100}%` }} />
                </span>
              )}
              <span className="text-right tabular-nums">{r.hidden ? "" : <><b>{fmt1(r.agg.final.mean)}</b> <span className="text-xs text-gray-500">{LEVEL_LABEL[r.agg.final.level]}</span></>}</span>
            </button>
          ))}
        </div>
      </Panel>

      <Panel title={`Mapa de calor: ${level === "categorias" ? "categorías" : "dominios"} por ${label.toLowerCase()}`} subtitle="Calificación promedio coloreada por nivel de riesgo">
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0">
            <thead><tr>
              <th className="th sticky left-0 bg-white">{label}</th><th className="th text-right">n</th><th className="th text-center">Final</th>
              {cols.map((c) => <th key={c} className="th min-w-[86px] text-center align-bottom normal-case tracking-normal"><span className="line-clamp-3">{c}</span></th>)}
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name}>
                  <td className="td sticky left-0 bg-white"><button className="text-left font-medium text-brand-700 hover:underline disabled:text-gray-500 disabled:no-underline" disabled={r.hidden} onClick={() => setOnly(d, r.name)}>{r.name}</button></td>
                  <td className="td text-right tabular-nums text-gray-500">{r.n}</td>
                  <HeatCell hidden={r.hidden} value={r.agg.final.mean} level={r.agg.final.level} tip={<><b>{r.name}</b> · Final {fmt1(r.agg.final.mean)}</>} />
                  {cols.map((c) => {
                    const x = level === "categorias" ? r.agg.categories.find((k) => k.name === c) : r.agg.domains.find((k) => k.name === c);
                    return <HeatCell key={c} hidden={r.hidden} value={x?.mean} level={x?.level}
                      tip={x && <><b>{r.name}</b><br />{c}: {fmt1(x.mean)} ({LEVEL_LABEL[x.level]})<br />Alto+: {pct(x.distribution.ALTO + x.distribution.MUY_ALTO, r.n)}% de {r.n}
                        {level === "dominios" && <><br /><span className="text-gray-500">Índice {fmt1(riskIndex(x.mean, g.domainCuts[c], maxDomain[c]))}/5</span></>}</>} />;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

/* ================= Reactivos ================= */
type ItemRow = { n: number; text: string; domain: string; category: string; counts: number[]; answered: number; mean: number; unfav: number; inverse: boolean };
function topItems(g: GuideT, recs: Rec[], itemMap: Record<number, { domain: string; category: string }>): ItemRow[] {
  return Array.from({ length: g.items }, (_, i) => {
    const n = i + 1;
    const counts = [0, 0, 0, 0, 0]; // por puntos de riesgo 0..4
    let answered = 0;
    for (const r of recs) {
      const v = r.it[i];
      if (v === null || v === undefined) continue;
      counts[g.inverse.has(n) ? v : 4 - v]++; answered++;
    }
    const pts = counts.reduce((s, c, k) => s + c * k, 0);
    return { n, text: g.text(n), ...itemMap[n], counts, answered, mean: answered ? pts / answered : 0, unfav: pct(counts[3] + counts[4], answered), inverse: g.inverse.has(n) };
  }).filter((r) => r.answered > 0).sort((a, b) => b.mean - a.mean);
}
function ItemRows({ rows }: { rows: ItemRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px]">
        <thead className="border-b border-gray-200"><tr>
          <th className="th w-10">#</th><th className="th">Reactivo</th><th className="th w-[28%]">Respuestas (riesgo ← → )</th><th className="th text-right">Desfav.</th><th className="th text-right">Pts.</th>
        </tr></thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => (
            <tr key={r.n}>
              <td className="td text-gray-500 tabular-nums">{r.n}</td>
              <td className="td"><div className="text-gray-900">{r.text}</div><div className="text-[11px] text-gray-400">{r.domain} · {r.answered} respuestas{r.inverse ? " · reactivo positivo (Siempre = 0)" : ""}</div></td>
              <td className="td"><RiskDiverging counts={r.counts} label={`${r.n}. ${r.text}`} /></td>
              <td className="td text-right tabular-nums">{r.unfav}%</td>
              <td className="td text-right font-semibold tabular-nums">{r.mean.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Reactivos({ g, fRecs, itemMap }: { g: GuideT; fRecs: Rec[]; itemMap: Record<number, { domain: string; category: string }> }) {
  const [q, setQ] = useState("");
  const [dom, setDom] = useState("");
  const [order, setOrder] = useState<"riesgo" | "numero">("riesgo");
  let rows = topItems(g, fRecs, itemMap);
  if (order === "numero") rows = rows.sort((a, b) => a.n - b.n);
  if (dom) rows = rows.filter((r) => r.domain === dom || r.category === dom);
  const t = q.trim().toLowerCase();
  if (t) rows = rows.filter((r) => r.text.toLowerCase().includes(t) || String(r.n) === t);
  return (
    <Panel title="Análisis por reactivo" subtitle="Las respuestas se ordenan por su riesgo real (en reactivos positivos, “Siempre” es sin riesgo)" right={<RiskLegend />}>
      <div className="mb-3 flex flex-wrap gap-3">
        <input className="input max-w-xs" placeholder="Buscar texto o número…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input max-w-xs" value={dom} onChange={(e) => setDom(e.target.value)}>
          <option value="">Todas las categorías y dominios</option>
          {Object.entries(g.categories).map(([c, ds]) => <optgroup key={c} label={c}><option value={c}>{c} (toda)</option>{ds.map((d2) => <option key={d2} value={d2}>{d2}</option>)}</optgroup>)}
        </select>
        <select className="input max-w-[12rem]" value={order} onChange={(e) => setOrder(e.target.value as typeof order)}><option value="riesgo">Mayor riesgo primero</option><option value="numero">Por número</option></select>
        <span className="self-center text-sm text-gray-500">{rows.length} reactivos</span>
      </div>
      <ItemRows rows={rows} />
    </Panel>
  );
}

/* ================= Guía I y entorno físico ================= */
function GuiaI({ ev, fRecs, dimensions, minGroup, canSeeConfidential }: { ev: Props["evaluation"]; fRecs: Rec[]; dimensions: { key: string; label: string }[]; minGroup: number; canSeeConfidential: boolean }) {
  const n = fRecs.length;
  const ev1 = fRecs.filter((r) => r.g1 >= 1).length, req = fRecs.filter((r) => r.g1 === 2).length;
  const [dim, setDim] = useState("departamento");
  const groups: Record<string, Rec[]> = {};
  fRecs.forEach((r) => (groups[r.d[dim]] ??= []).push(r));
  const factors = [...new Set(fRecs.flatMap((r) => Object.keys(r.p)))];
  const { show, hide } = useTip();
  return (
    <div className="space-y-4">
      {ev.includeGuideI && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Kpi label="Sin acontecimiento traumático" value={n - ev1} sub={`${pct(n - ev1, n)}%`} />
            <Kpi label="Vivieron un acontecimiento (sin criterios clínicos)" value={ev1 - req} sub={`${pct(ev1 - req, n)}%`} tone="text-amber-600" />
            <Kpi label="Requieren valoración clínica" value={req} sub={canSeeConfidential ? "Ver “Seguimiento confidencial”" : `${pct(req, n)}%`} tone={req ? "text-red-600" : "text-gray-900"} />
          </div>
          <Panel title="Guía I por grupo" subtitle={`Porcentaje de trabajadores por resultado · grupos con menos de ${minGroup} se ocultan`}
            right={<select className="input w-52" value={dim} onChange={(e) => setDim(e.target.value)}>{dimensions.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}</select>}>
            <div className="space-y-1.5">
              {Object.entries(groups).sort((a, b) => b[1].length - a[1].length).map(([name, rs]) => {
                const k = rs.length, a = rs.filter((r) => r.g1 === 1).length, b = rs.filter((r) => r.g1 === 2).length;
                return (
                  <div key={name} className="grid grid-cols-[minmax(0,12rem)_1fr_6rem] items-center gap-3 text-sm">
                    <span className="truncate">{name} <span className="text-xs text-gray-400">n={k}</span></span>
                    {k < minGroup ? <span className="text-xs text-gray-400">Grupo pequeño — oculto</span> : (
                      <span className="flex h-4 gap-[2px] overflow-hidden rounded bg-gray-100"
                        onMouseMove={(e) => show(e, <><b>{name}</b><br />Sin acontecimiento: {k - a - b}<br />Acontecimiento sin criterios: {a}<br />Requieren valoración: {b}</>)} onMouseLeave={hide}>
                        <span style={{ width: `${((k - a - b) / k) * 100}%`, background: "#cbd5e1" }} />
                        <span style={{ width: `${(a / k) * 100}%`, background: "#f6c026" }} />
                        <span style={{ width: `${(b / k) * 100}%`, background: "#e53935" }} />
                      </span>
                    )}
                    <span className="text-right tabular-nums text-xs">{k < minGroup ? "" : `${pct(b, k)}% requieren`}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-600">
              {[["#cbd5e1", "Sin acontecimiento"], ["#f6c026", "Acontecimiento sin criterios"], ["#e53935", "Requiere valoración clínica"]].map(([c, l]) =>
                <span key={l} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: c }} />{l}</span>)}
            </div>
            <p className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-800">{GUIA_I_ACTION}</p>
          </Panel>
        </>
      )}
      {factors.length > 0 && (
        <Panel title="Condiciones físicas del lugar de trabajo" subtitle="Percepción de los trabajadores (complementa la categoría Ambiente de trabajo)">
          <div className="space-y-2">
            {factors.map((f) => {
              const counts = PHYS_ORDER.map((o) => fRecs.filter((r) => r.p[f] === o).length);
              const tot = counts.reduce((a, b) => a + b, 0) || 1;
              return (
                <div key={f} className="grid grid-cols-[8rem_1fr_5.5rem] items-center gap-3 text-sm"
                  onMouseMove={(e) => show(e, <><b>{f}</b>{PHYS_ORDER.map((o, i) => <div key={o}>{o}: {counts[i]} ({pct(counts[i], tot)}%)</div>)}</>)} onMouseLeave={hide}>
                  <span>{f}</span>
                  <span className="flex h-4 gap-[2px] overflow-hidden rounded">{counts.map((c, i) => c > 0 && <span key={i} style={{ width: `${(c / tot) * 100}%`, background: PHYS_HEX[i] }} />)}</span>
                  <span className="text-right text-xs tabular-nums text-gray-600">{pct(counts[3] + counts[4], tot)}% mal</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-600">{PHYS_ORDER.map((o, i) => <span key={o} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: PHYS_HEX[i] }} />{o}</span>)}</div>
        </Panel>
      )}
    </div>
  );
}

/* ================= Perfil ================= */
function Perfil({ dimensions, fRecs, filters, toggle }: { dimensions: { key: string; label: string }[]; fRecs: Rec[]; filters: Filters; toggle: (k: string, v: string) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {dimensions.map(({ key, label }) => {
        const c: Record<string, number> = {};
        fRecs.forEach((r) => (c[r.d[key]] = (c[r.d[key]] ?? 0) + 1));
        const data = sortVals(key, Object.keys(c)).map((k) => [k, c[k]] as [string, number]);
        if (data.length === 1 && data[0][0] === "Sin dato") return null;
        return <Panel key={key} title={label} subtitle="Clic en una barra para filtrar"><FreqBars data={ORDINAL[key] ? data : data.sort((a, b) => b[1] - a[1])} onPick={(v) => toggle(key, v)} active={filters[key]} /></Panel>;
      })}
    </div>
  );
}

/* ================= Plan de acción ================= */
function Plan({ ev, g, agg, n, fRecs, maxDomain }: { ev: Props["evaluation"]; g: GuideT; agg: AggT; n: number; fRecs: Rec[]; maxDomain: Record<string, number> }) {
  const doms = agg.domains.map((d) => ({ ...d, idx: riskIndex(d.mean, g.domainCuts[d.name], maxDomain[d.name]), hi: pct(d.distribution.ALTO + d.distribution.MUY_ALTO, n) }))
    .sort((a, b) => b.idx - a.idx);
  const priority = doms.filter((d) => ["MEDIO", "ALTO", "MUY_ALTO"].includes(d.level));
  const watch = doms.filter((d) => !["MEDIO", "ALTO", "MUY_ALTO"].includes(d.level) && d.hi >= 25);
  const req = fRecs.filter((r) => r.g1 === 2).length;

  function exportCsv() {
    const rows = [["Prioridad", "Dominio", "Categoría", "Calificación", "Nivel", "% trabajadores alto o muy alto", "Nivel de intervención", "Acción sugerida", "Responsable", "Fecha compromiso", "Indicador de seguimiento"]];
    priority.forEach((d, i) => INTERVENTIONS[d.name].actions.forEach((a) =>
      rows.push([String(i + 1), d.name, d.category, fmt1(d.mean), LEVEL_LABEL[d.level], `${d.hi}%`, INTERVENTIONS[d.name].level, a, "", "", ""])));
    if (req) rows.push(["—", "Guía I", "Acontecimientos traumáticos severos", String(req), "Requieren valoración", "", "Tercer nivel", GUIA_I_ACTION, "", "", ""]);
    const csv = "﻿" + rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `Plan_intervencion_${ev.name.replace(/\s+/g, "_")}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="space-y-4">
      <Panel title="Criterio general para la toma de acciones" subtitle={`Calificación final ${fmt1(agg.final.mean)} · ${LEVEL_LABEL[agg.final.level]}`}
        right={<button className="btn-primary print:hidden" onClick={exportCsv}>Exportar plan (Excel/CSV)</button>}>
        <div className="flex items-start gap-3"><Badge level={agg.final.level} /><p className="text-sm text-gray-700">{LEVEL_ACTION[agg.final.level]}</p></div>
        {(agg.final.level === "MEDIO" || agg.final.level === "ALTO" || agg.final.level === "MUY_ALTO") && (
          <p className="mt-2 text-xs text-gray-500">El nivel obtenido obliga a elaborar un Programa de intervención (numeral 8.4): áreas y trabajadores sujetos, tipo de acciones, fechas, control de avances, evaluación posterior y responsable.</p>
        )}
      </Panel>

      {ev.includeGuideI && req > 0 && (
        <section className="card border-red-200 bg-red-50 p-5">
          <h2 className="font-semibold text-red-800">Atención prioritaria · Guía I</h2>
          <p className="mt-1 text-sm text-red-800">{req} {req === 1 ? "trabajador requiere" : "trabajadores requieren"} valoración clínica. {GUIA_I_ACTION}</p>
        </section>
      )}

      {priority.length === 0 && <Empty>Ningún dominio está en nivel medio o superior en esta selección. Mantén la difusión de la política de prevención.</Empty>}
      <div className="grid gap-4 lg:grid-cols-2">
        {priority.map((d, i) => {
          const iv = INTERVENTIONS[d.name];
          return (
            <section key={d.name} className="card overflow-hidden">
              <div className="h-1.5" style={{ background: LEVEL_HEX[d.level] }} />
              <div className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold text-gray-500">Prioridad {i + 1} · {d.category}</div>
                    <h3 className="text-base font-semibold">{d.name}</h3>
                  </div>
                  <div className="text-right"><Badge level={d.level} /><div className="mt-1 text-xs tabular-nums text-gray-500">{fmt1(d.mean)} pts · {d.hi}% alto+</div></div>
                </div>
                <p className="mt-2 text-sm text-gray-600">{iv.focus}</p>
                <ul className="mt-3 space-y-1.5 text-sm text-gray-800">
                  {iv.actions.map((a) => <li key={a} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: LEVEL_HEX[d.level] }} />{a}</li>)}
                </ul>
                <div className="mt-3 text-xs text-gray-500">Nivel de intervención sugerido: <b>{iv.level}</b>{d.level === "MUY_ALTO" || d.level === "ALTO" ? " · incluir evaluación específica y campaña de sensibilización" : ""}</div>
              </div>
            </section>
          );
        })}
      </div>
      {watch.length > 0 && (
        <Panel title="En observación" subtitle="Dominios con nivel bajo o nulo en promedio, pero con 25% o más de trabajadores en nivel alto">
          <ul className="space-y-1 text-sm">{watch.map((d) => <li key={d.name} className="flex items-center gap-2"><Badge level={d.level} />{d.name} — {d.hi}% en nivel alto o muy alto</li>)}</ul>
        </Panel>
      )}
    </div>
  );
}

/* ================= KPIs y KRIs ================= */
const LIGHT_STYLE: Record<Light, { bg: string; fg: string; label: string }> = {
  VERDE: { bg: "#34a853", fg: "#fff", label: "En control" },
  AMARILLO: { bg: "#f6c026", fg: "#1f2937", label: "Vigilancia" },
  ROJO: { bg: "#e53935", fg: "#fff", label: "Acción inmediata" },
  SIN_DATOS: { bg: "#e5e7eb", fg: "#4b5563", label: "Sin datos" },
};
function Kpis({ kpis, filtered, hasPrev }: { kpis: Kpi[]; filtered: boolean; hasPrev: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const counts = (["ROJO", "AMARILLO", "VERDE", "SIN_DATOS"] as Light[]).map((l) => [l, kpis.filter((k) => k.light === l).length] as const);
  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-4 p-4">
        {counts.map(([l, c]) => (
          <div key={l} className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold" style={{ background: LIGHT_STYLE[l].bg, color: LIGHT_STYLE[l].fg }}>{c}</span>
            <span className="text-sm text-gray-700">{LIGHT_STYLE[l].label}</span>
          </div>
        ))}
        <p className="text-xs text-gray-500 md:ml-auto">
          Indicadores de encuesta: respetan los filtros{filtered ? " activos" : ""}. Indicadores de centro (capacitación, quejas, ATS, programa): todo el centro de trabajo.
          {!hasPrev && " Selecciona un periodo en “Comparar con” para ΔIGR, TRPA y EDI."}
        </p>
      </div>
      {([1, 2, 3, 4] as const).map((dim) => (
        <section key={dim} className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{dim} · {DIM_NAMES[dim]}</h2>
          <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
            {kpis.filter((k) => k.dim === dim).map((k) => {
              const st = LIGHT_STYLE[k.light];
              const isOpen = open === k.id;
              return (
                <article key={k.id} className="card flex flex-col overflow-hidden">
                  <div className="h-1.5" style={{ background: st.bg }} />
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold text-gray-500">{k.id} · {k.short} · {k.type}{k.scope === "centro" ? " · centro" : ""}</div>
                        <h3 className="text-sm font-semibold leading-snug text-gray-900">{k.name}</h3>
                      </div>
                      <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: st.bg, color: st.fg }}>{st.label}</span>
                    </div>
                    <div className="mt-2 text-3xl font-bold tabular-nums text-gray-900">{k.display}</div>
                    <p className="mt-1 text-xs text-gray-600">{k.detail}</p>
                    <button className="mt-auto pt-3 text-left text-xs font-medium text-brand-700 hover:underline print:hidden" onClick={() => setOpen(isOpen ? null : k.id)}>
                      {isOpen ? "Ocultar ficha técnica" : "Ver ficha técnica"}
                    </button>
                    {isOpen && (
                      <dl className="mt-2 space-y-1.5 rounded-lg bg-gray-50 p-3 text-xs text-gray-700">
                        <div><dt className="font-semibold">Fórmula</dt><dd>{k.formula}</dd></div>
                        <div><dt className="font-semibold">Frecuencia</dt><dd>{k.frequency}</dd></div>
                        <div><dt className="font-semibold">Fuente</dt><dd>{k.source}</dd></div>
                        <div><dt className="font-semibold">Umbrales</dt><dd>{k.thresholds}</dd></div>
                      </dl>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
