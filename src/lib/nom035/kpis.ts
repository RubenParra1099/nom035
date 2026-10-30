/**
 * Catálogo de KPIs y KRIs NOM-035 (fichas técnicas en el documento "Catálogo de KPIs y KRIs · NOM-035-STPS-2018").
 * Funciones puras: reciben respuestas anónimas y registros de intervención y devuelven valor + semáforo.
 */
import { C, D, GUIDES, type GuideId } from "./guides";
import { aggregate, scoreWorker, type ScoreResult } from "./score";
import { meanChange, meanMoe, propChange, wilson, type Change } from "./stats";

export type KpiRec = { d: Record<string, string>; it: (number | null)[]; g1: 0 | 1 | 2 };
export type InterventionData = {
  complaints: { receivedAt: string; closedAt: string | null; category: string }[];
  trainings: { area: string | null; attendees: number; preScore: number | null; postScore: number | null }[];
  prevActions: { domain: string }[];
  actions: { dueDate: string; doneAt: string | null }[];
  ats: { status: string; identifiedAt: string; canalizedAt: string | null }[];
};
export type Light = "VERDE" | "AMARILLO" | "ROJO" | "SIN_DATOS";
export type Kpi = {
  id: string; dim: 1 | 2 | 3 | 4; name: string; short: string; type: "Efectividad" | "Impacto" | "Tendencia";
  value: number | null; display: string; light: Light; detail: string;
  formula: string; frequency: string; source: string; thresholds: string; scope: "encuesta" | "centro";
  /** Margen de error al 95% (misma unidad que el valor) y cambio contra el periodo anterior. */
  n?: number; moe?: number | null; change?: (Change & { unit: string }) | null;
};
type Stat = { kind: "prop"; x: number; n: number } | { kind: "mean"; values: number[] };

export const DIM_NAMES: Record<1 | 2 | 3 | 4, string> = {
  1: "Liderazgo y relaciones en el trabajo",
  2: "Carga de trabajo y control",
  3: "Entorno organizacional favorable",
  4: "Efectividad de las medidas de intervención",
};

/** Semáforo: `lower` = menor es mejor (verde si v < g); `higher` = mayor es mejor (verde si v >= g). */
function light(v: number | null, dir: "lower" | "higher", g: number, y: number): Light {
  if (v === null || !Number.isFinite(v)) return "SIN_DATOS";
  if (dir === "lower") return v < g ? "VERDE" : v <= y ? "AMARILLO" : "ROJO";
  return v >= g ? "VERDE" : v >= y ? "AMARILLO" : "ROJO";
}
const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : null);
const f1 = (v: number | null, suf = "") => (v === null || !Number.isFinite(v) ? "—" : `${v.toLocaleString("es-MX", { maximumFractionDigits: 1 })}${suf}`);
const f2 = (v: number | null) => (v === null || !Number.isFinite(v) ? "—" : v.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const days = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86400000;

const ITEMS: Record<GuideId, Record<string, number[]>> = {
  GUIA_III: { hostig: [58, 59, 60, 61, 62, 63], peers: [42, 43, 44, 45, 46], jornada: [17, 18], capac: [35, 36], estab: [53, 54] },
  GUIA_II: { hostig: [34, 35, 36, 37, 38, 39], peers: [30, 31, 32], jornada: [14, 15], capac: [26, 27], estab: [] },
};

/** Estadísticos por trabajador de los KPIs de encuesta (para margen de error y pruebas de cambio). */
function surveyStats(guide: GuideId, records: KpiRec[]): Record<string, Stat> {
  const g = GUIDES[guide];
  const sets = ITEMS[guide];
  const sc = records.map((r) => scoreWorker(guide, Object.fromEntries(r.it.map((v, i) => [i + 1, v]))));
  const N = records.length;
  const risk = (r: KpiRec, n: number) => { const v = r.it[n - 1]; return v === null || v === undefined ? null : g.inverse.has(n) ? v : 4 - v; };
  const hi = (d: string) => ({ kind: "prop" as const, x: sc.filter((s) => s.domains[d] >= g.domainCuts[d][2]).length, n: N });
  const any = (items: number[]) => ({ kind: "prop" as const, x: records.filter((r) => items.some((k) => { const p = risk(r, k); return p !== null && p >= 3; })).length, n: N });
  const fav = (d: string) => ({ kind: "mean" as const, values: sc.map((s) => 100 * (1 - s.domains[d] / (g.domains[d].length * 4))) });
  const share = (items: number[], pred: (p: number) => boolean) => ({ kind: "mean" as const, values: records.map((r) => {
    const ps = items.map((k) => risk(r, k)).filter((p): p is number => p !== null);
    return ps.length ? (ps.filter(pred).length / ps.length) * 100 : null;
  }).filter((v): v is number => v !== null) });
  const out: Record<string, Stat> = {
    "LR-01": hi(D.VIOL), "LR-02": any(sets.hostig), "LR-03": fav(D.LIDER), "LR-06": share(sets.peers, (p) => p <= 1),
    "CC-01": hi(D.CARGA), "CC-02": any(sets.jornada), "CC-03": hi(D.INTERF), "CC-04": fav(D.CONTROL),
    "EO-04": share(sets.capac, (p) => p >= 3),
    "EI-01": { kind: "mean", values: sc.map((s) => s.final) },
    "EI-02": { kind: "prop", x: sc.filter((s) => s.finalLevel === "ALTO" || s.finalLevel === "MUY_ALTO").length, n: N },
  };
  if (guide === "GUIA_III") {
    out["LR-05"] = hi(D.RECON); out["EO-02"] = hi(D.PERT); out["EO-03"] = any(sets.estab);
    out["EO-01"] = { kind: "mean", values: sc.map((s) => 100 * (1 - s.categories[C.ENT] / 40)) };
  }
  return out;
}

export function computeKpis(opts: {
  guide: GuideId; records: KpiRec[]; prevRecords?: KpiRec[]; headcount: number; minGroup: number;
  intervention?: InterventionData; today?: string; areaHeadcount?: Record<string, number>;
  /** Población de la selección para la corrección por población finita (sin filtros = plantilla del centro). */
  population?: number | null;
}): Kpi[] {
  const list = computeKpisRaw(opts);
  // Margen de error y significancia del cambio contra el periodo anterior
  const now = surveyStats(opts.guide, opts.records);
  const before = opts.prevRecords && opts.prevRecords.length >= opts.minGroup ? surveyStats(opts.guide, opts.prevRecords) : null;
  const N = opts.population === null ? undefined : opts.population ?? (opts.headcount > 0 ? opts.headcount : undefined);
  for (const k of list) {
    const st = now[k.id];
    if (!st || k.value === null) continue;
    if (k.id !== "EI-01" && k.id !== "EI-02") {
      if (st.kind === "prop") { const ci = wilson(st.x, st.n, N); k.n = st.n; k.moe = ci ? (ci[1] - ci[0]) / 2 : null; }
      else { k.n = st.values.length; k.moe = meanMoe(st.values, N); }
    }
    const b = before?.[k.id];
    if (b && b.kind === st.kind) {
      const c = st.kind === "prop" ? propChange(st.x, st.n, (b as { x: number }).x, (b as { n: number }).n) : meanChange(st.values, (b as { values: number[] }).values);
      k.change = c ? { ...c, unit: st.kind === "prop" ? "pp" : k.id === "EI-01" ? "pts" : "pts" } : null;
    }
  }
  return list;
}

function computeKpisRaw(opts: {
  guide: GuideId; records: KpiRec[]; prevRecords?: KpiRec[]; headcount: number; minGroup: number;
  intervention?: InterventionData; today?: string; areaHeadcount?: Record<string, number>;
}): Kpi[] {
  const { guide, records, prevRecords, headcount, minGroup, intervention } = opts;
  const today = opts.today ?? new Date().toISOString().slice(0, 10);
  const g = GUIDES[guide];
  const sets = ITEMS[guide];
  const toObj = (r: KpiRec) => Object.fromEntries(r.it.map((v, i) => [i + 1, v]));
  const sc: ScoreResult[] = records.map((r) => scoreWorker(guide, toObj(r)));
  const N = records.length;
  const risk = (r: KpiRec, n: number) => { const v = r.it[n - 1]; return v === null || v === undefined ? null : g.inverse.has(n) ? v : 4 - v; };
  const altoDom = (d: string) => g.domainCuts[d]?.[2];
  const hiShare = (scs: ScoreResult[], d: string) => pct(scs.filter((s) => s.domains[d] >= altoDom(d)).length, scs.length);
  const favIndex = (scs: ScoreResult[], d: string) => {
    const max = g.domains[d].length * 4;
    return scs.length ? 100 * (1 - scs.reduce((a, s) => a + s.domains[d], 0) / (scs.length * max)) : null;
  };
  const answerShare = (items: number[], pred: (p: number) => boolean) => {
    let num = 0, den = 0;
    for (const r of records) for (const n of items) { const p = risk(r, n); if (p !== null) { den++; if (pred(p)) num++; } }
    return pct(num, den);
  };
  const workerAny = (items: number[], pred: (p: number) => boolean) =>
    pct(records.filter((r) => items.some((n) => { const p = risk(r, n); return p !== null && pred(p); })).length, N);
  const finalHi = (s: ScoreResult) => s.finalLevel === "ALTO" || s.finalLevel === "MUY_ALTO";
  const groupHi = (pred: (r: KpiRec) => boolean) => {
    const idx = records.map((r, i) => (pred(r) ? i : -1)).filter((i) => i >= 0);
    return idx.length >= minGroup ? { share: pct(idx.filter((i) => finalHi(sc[i])).length, idx.length)!, n: idx.length } : null;
  };
  const out: Kpi[] = [];
  const push = (k: Omit<Kpi, "light"> & { dir: "lower" | "higher"; g: number; y: number }) => {
    const { dir, g: gg, y, ...rest } = k;
    out.push({ ...rest, light: light(k.value, dir, gg, y) });
  };
  const hasG3 = guide === "GUIA_III";

  /* ---------- 1 · Liderazgo y relaciones ---------- */
  const tevl = hiShare(sc, D.VIOL);
  push({ id: "LR-01", dim: 1, name: "Tasa de Exposición a Violencia Laboral", short: "TEVL", type: "Impacto", scope: "encuesta",
    value: tevl, display: f1(tevl, "%"), detail: `${sc.filter((s) => s.domains[D.VIOL] >= altoDom(D.VIOL)).length} de ${N} trabajadores con Violencia en Alto+`,
    formula: `(trabajadores con dominio Violencia ≥ ${altoDom(D.VIOL)} pts ÷ N) × 100`, frequency: "Por evaluación + pulso semestral",
    source: hasG3 ? "Guía III reactivos 57–64" : "Guía II reactivos 33–40", thresholds: "Verde < 5% · Amarillo 5–10% · Rojo > 10%", dir: "lower", g: 5, y: 10 });
  const phr = workerAny(sets.hostig, (p) => p >= 3);
  push({ id: "LR-02", dim: 1, name: "Prevalencia de Hostigamiento Recurrente", short: "PHR", type: "Impacto", scope: "encuesta",
    value: phr, display: f1(phr, "%"), detail: "Trabajadores con al menos una conducta de hostigamiento Siempre o Casi siempre",
    formula: "(trabajadores con ≥ 1 reactivo de hostigamiento en Siempre/Casi siempre ÷ N) × 100", frequency: "Semestral",
    source: hasG3 ? "Guía III reactivos 58–63" : "Guía II reactivos 34–39", thresholds: "Verde < 3% · Amarillo 3–8% · Rojo > 8%", dir: "lower", g: 3, y: 8 });
  const icl = favIndex(sc, D.LIDER);
  push({ id: "LR-03", dim: 1, name: "Índice de Calidad del Liderazgo", short: "ICL", type: "Efectividad", scope: "encuesta",
    value: icl, display: f1(icl), detail: "Puntaje favorable 0–100 del dominio Liderazgo",
    formula: `100 × (1 − Σ puntos Liderazgo ÷ (N × ${g.domains[D.LIDER].length * 4}))`, frequency: "Semestral",
    source: hasG3 ? "Guía III 31–34, 37–41" : "Guía II 23–25, 28–29", thresholds: "Verde ≥ 75 · Amarillo 60–74 · Rojo < 60", dir: "higher", g: 75, y: 60 });
  // Brecha entre áreas
  const areas: Record<string, ScoreResult[]> = {};
  records.forEach((r, i) => (areas[r.d.departamento] ??= []).push(sc[i]));
  const areaIcl = Object.entries(areas).filter(([k, v]) => k !== "Sin dato" && v.length >= minGroup).map(([k, v]) => ({ k, v: favIndex(v, D.LIDER)! }));
  const bla = areaIcl.length >= 2 ? Math.max(...areaIcl.map((a) => a.v)) - Math.min(...areaIcl.map((a) => a.v)) : null;
  const best = areaIcl.slice().sort((a, b) => b.v - a.v);
  push({ id: "LR-04", dim: 1, name: "Brecha de Liderazgo entre Áreas", short: "BLA", type: "Impacto", scope: "encuesta",
    value: bla, display: bla === null ? "—" : `${f1(bla)} pts`,
    detail: best.length >= 2 ? `Mejor: ${best[0].k} (${f1(best[0].v)}) · Menor: ${best[best.length - 1].k} (${f1(best[best.length - 1].v)})` : `Se requieren 2 áreas con ${minGroup}+ respuestas`,
    formula: "ICL máximo por área − ICL mínimo por área", frequency: "Semestral", source: "Dominio Liderazgo + dato general Área",
    thresholds: "Verde < 10 · Amarillo 10–20 · Rojo > 20", dir: "lower", g: 10, y: 20 });
  if (hasG3) {
    const drd = hiShare(sc, D.RECON);
    push({ id: "LR-05", dim: 1, name: "Déficit de Reconocimiento del Desempeño", short: "DRD", type: "Impacto", scope: "encuesta",
      value: drd, display: f1(drd, "%"), detail: "Trabajadores con Reconocimiento del desempeño en Alto+",
      formula: `(trabajadores con dominio Reconocimiento ≥ ${altoDom(D.RECON)} pts ÷ N) × 100`, frequency: "Por evaluación + pulso semestral",
      source: "Guía III reactivos 47–52", thresholds: "Verde < 15% · Amarillo 15–30% · Rojo > 30%", dir: "lower", g: 15, y: 30 });
  }
  const iasp = answerShare(sets.peers, (p) => p <= 1);
  push({ id: "LR-06", dim: 1, name: "Índice de Apoyo Social entre Pares", short: "IASP", type: "Efectividad", scope: "encuesta",
    value: iasp, display: f1(iasp, "%"), detail: "Respuestas favorables sobre confianza, cooperación y ayuda entre compañeros",
    formula: "(respuestas con 0–1 puntos de riesgo ÷ respuestas a reactivos de pares) × 100", frequency: "Semestral",
    source: hasG3 ? "Guía III 42–46" : "Guía II 30–32", thresholds: "Verde ≥ 70% · Amarillo 50–69% · Rojo < 50%", dir: "higher", g: 70, y: 50 });

  /* ---------- 2 · Carga y control ---------- */
  const tsc = hiShare(sc, D.CARGA);
  push({ id: "CC-01", dim: 2, name: "Tasa de Sobrecarga Crítica", short: "TSC", type: "Impacto", scope: "encuesta",
    value: tsc, display: f1(tsc, "%"), detail: "Trabajadores con Carga de trabajo en Alto+",
    formula: `(trabajadores con dominio Carga ≥ ${altoDom(D.CARGA)} pts ÷ N) × 100`, frequency: "Semestral",
    source: hasG3 ? "Guía III 6–16, 65–68" : "Guía II 4–13, 41–43", thresholds: "Verde < 15% · Amarillo 15–30% · Rojo > 30%", dir: "lower", g: 15, y: 30 });
  const ije = workerAny(sets.jornada, (p) => p >= 3);
  push({ id: "CC-02", dim: 2, name: "Índice de Jornada Extendida", short: "IJE", type: "Impacto", scope: "encuesta",
    value: ije, display: f1(ije, "%"), detail: "Horas extra > 3 veces por semana o trabajo en días de descanso, Siempre/Casi siempre",
    formula: "(trabajadores con reactivo de jornada en Siempre/Casi siempre ÷ N) × 100", frequency: "Trimestral (nómina) / semestral",
    source: hasG3 ? "Guía III 17–18" : "Guía II 14–15", thresholds: "Verde < 10% · Amarillo 10–25% · Rojo > 25%", dir: "lower", g: 10, y: 25 });
  const pitf = hiShare(sc, D.INTERF);
  push({ id: "CC-03", dim: 2, name: "Prevalencia de Interferencia Trabajo-Familia", short: "PITF", type: "Impacto", scope: "encuesta",
    value: pitf, display: f1(pitf, "%"), detail: "Trabajadores con Interferencia trabajo-familia en Alto+",
    formula: `(trabajadores con dominio Interferencia ≥ ${altoDom(D.INTERF)} pts ÷ N) × 100`, frequency: "Semestral",
    source: hasG3 ? "Guía III 19–22" : "Guía II 16–17", thresholds: "Verde < 10% · Amarillo 10–20% · Rojo > 20%", dir: "lower", g: 10, y: 20 });
  const iac = favIndex(sc, D.CONTROL);
  push({ id: "CC-04", dim: 2, name: "Índice de Autonomía y Control", short: "IAC", type: "Efectividad", scope: "encuesta",
    value: iac, display: f1(iac), detail: "Puntaje favorable 0–100 del dominio Falta de control sobre el trabajo",
    formula: `100 × (1 − Σ puntos Falta de control ÷ (N × ${g.domains[D.CONTROL].length * 4}))`, frequency: "Semestral",
    source: hasG3 ? "Guía III 23–30, 35–36" : "Guía II 18–22, 26–27", thresholds: "Verde ≥ 70 · Amarillo 55–69 · Rojo < 55", dir: "higher", g: 70, y: 55 });
  const xs = sc.map((s) => s.domains[D.CARGA]), ys = sc.map((s) => s.domains[D.INTERF]);
  const mx = xs.reduce((a, b) => a + b, 0) / (N || 1), my = ys.reduce((a, b) => a + b, 0) / (N || 1);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < N; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; }
  const r = N >= 10 && sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : null;
  push({ id: "CC-05", dim: 2, name: "Coeficiente de Desbordamiento Carga–Familia", short: "CDCF", type: "Tendencia", scope: "encuesta",
    value: r, display: r === null ? "—" : `r = ${f2(r)}`, detail: r === null ? "Se requieren 10+ respuestas" : r > 0.5 ? "La interferencia familiar se explica por la carga: reducir carga antes que medidas de conciliación" : r >= 0.3 ? "Relación moderada entre carga e interferencia" : "La interferencia tiene otras causas (turnos, traslados)",
    formula: "Correlación de Pearson entre calificación individual de Carga e Interferencia", frequency: "Por evaluación",
    source: "Calificaciones individuales Guía II/III", thresholds: "Verde r < 0.30 · Amarillo 0.30–0.50 · Rojo r > 0.50", dir: "lower", g: 0.3, y: 0.5 });
  const isShift = (x: KpiRec) => /nocturno|mixto/i.test(x.d.jornada) || x.d.rotacion === "Sí";
  const isDay = (x: KpiRec) => /diurno/i.test(x.d.jornada) && x.d.rotacion !== "Sí";
  const gs = groupHi(isShift), gd = groupHi(isDay);
  const rrj = gs && gd && gd.share > 0 ? gs.share / gd.share : null;
  push({ id: "CC-06", dim: 2, name: "Riesgo Relativo por Tipo de Jornada", short: "RRJ", type: "Impacto", scope: "encuesta",
    value: rrj, display: rrj === null ? "—" : `${f2(rrj)}×`,
    detail: gs && gd ? `Alto+ en turnos/rotación: ${f1(gs.share, "%")} (n=${gs.n}) vs diurno fijo: ${f1(gd.share, "%")} (n=${gd.n})` : `Se requieren ${minGroup}+ respuestas en cada grupo`,
    formula: "% Alto+ en jornada nocturna/mixta o con rotación ÷ % Alto+ en jornada diurna fija", frequency: "Por evaluación",
    source: "Calificación final + tipo de jornada y rotación", thresholds: "Verde < 1.2 · Amarillo 1.2–1.5 · Rojo > 1.5", dir: "lower", g: 1.2, y: 1.5 });

  /* ---------- 3 · Entorno organizacional ---------- */
  if (hasG3) {
    const ent = sc.length ? 100 * (1 - sc.reduce((a, s) => a + s.categories[C.ENT], 0) / (sc.length * 40)) : null;
    push({ id: "EO-01", dim: 3, name: "Índice de Entorno Organizacional Favorable", short: "IEOF", type: "Efectividad", scope: "encuesta",
      value: ent, display: f1(ent), detail: "Puntaje favorable 0–100 de la categoría Entorno organizacional",
      formula: "100 × (1 − Σ puntos categoría Entorno ÷ (N × 40))", frequency: "Semestral", source: "Guía III reactivos 47–56",
      thresholds: "Verde ≥ 75 · Amarillo 60–74 · Rojo < 60", dir: "higher", g: 75, y: 60 });
    const tdi = hiShare(sc, D.PERT);
    push({ id: "EO-02", dim: 3, name: "Tasa de Desapego e Inestabilidad", short: "TDI", type: "Impacto", scope: "encuesta",
      value: tdi, display: f1(tdi, "%"), detail: "Trabajadores con Pertenencia e inestabilidad en Alto+",
      formula: `(trabajadores con dominio Pertenencia ≥ ${altoDom(D.PERT)} pts ÷ N) × 100`, frequency: "Semestral", source: "Guía III reactivos 53–56",
      thresholds: "Verde < 10% · Amarillo 10–20% · Rojo > 20%", dir: "lower", g: 10, y: 20 });
    const pil = workerAny(sets.estab, (p) => p >= 3);
    push({ id: "EO-03", dim: 3, name: "Percepción de Inestabilidad Laboral", short: "PIL", type: "Impacto", scope: "encuesta",
      value: pil, display: f1(pil, "%"), detail: "No considera estable su trabajo o percibe rotación continua",
      formula: "(trabajadores con reactivo 53 o 54 desfavorable ÷ N) × 100", frequency: "Semestral y tras reestructuras", source: "Guía III reactivos 53–54",
      thresholds: "Verde < 15% · Amarillo 15–30% · Rojo > 30%", dir: "lower", g: 15, y: 30 });
  }
  const bcp = answerShare(sets.capac, (p) => p >= 3);
  push({ id: "EO-04", dim: 3, name: "Brecha de Capacitación Percibida", short: "BCP", type: "Efectividad", scope: "encuesta",
    value: bcp, display: f1(bcp, "%"), detail: "Respuestas desfavorables sobre acceso y utilidad de la capacitación",
    formula: "(respuestas con 3–4 pts en reactivos de capacitación ÷ respuestas a esos reactivos) × 100", frequency: "Semestral",
    source: hasG3 ? "Guía III 35–36" : "Guía II 26–27", thresholds: "Verde < 20% · Amarillo 20–35% · Rojo > 35%", dir: "lower", g: 20, y: 35 });
  const isNew = (x: KpiRec) => x.d.tiempoPuesto === "Menos de 6 meses" || x.d.tiempoPuesto === "Entre 6 meses y 1 año";
  const isOld = (x: KpiRec) => x.d.tiempoPuesto !== "Sin dato" && !isNew(x);
  const gn = groupHi(isNew), go = groupHi(isOld);
  const rrni = gn && go && go.share > 0 ? gn.share / go.share : null;
  push({ id: "EO-05", dim: 3, name: "Riesgo Relativo de Nuevo Ingreso", short: "RRNI", type: "Impacto", scope: "encuesta",
    value: rrni, display: rrni === null ? "—" : `${f2(rrni)}×`,
    detail: gn && go ? `Alto+ con < 1 año: ${f1(gn.share, "%")} (n=${gn.n}) vs ≥ 1 año: ${f1(go.share, "%")} (n=${go.n})` : `Se requieren ${minGroup}+ respuestas en cada grupo`,
    formula: "% Alto+ con antigüedad < 1 año ÷ % Alto+ con antigüedad ≥ 1 año", frequency: "Por evaluación",
    source: "Calificación final + tiempo en el puesto", thresholds: "Verde < 1.2 · Amarillo 1.2–1.5 · Rojo > 1.5", dir: "lower", g: 1.2, y: 1.5 });

  /* ---------- 4 · Efectividad de la intervención ---------- */
  const prevSc = prevRecords && prevRecords.length >= minGroup ? prevRecords.map((r) => scoreWorker(guide, toObj(r))) : null;
  const aNow = aggregate(guide, sc);
  const aPrev = prevSc ? aggregate(guide, prevSc) : null;
  const digr = aPrev && aPrev.final.mean > 0 ? ((aNow.final.mean - aPrev.final.mean) / aPrev.final.mean) * 100 : null;
  push({ id: "EI-01", dim: 4, name: "Variación del Índice Global de Riesgo", short: "ΔIGR", type: "Tendencia", scope: "encuesta",
    value: digr, display: digr === null ? "—" : `${digr > 0 ? "+" : ""}${f1(digr, "%")}`,
    detail: aPrev ? `Calificación final ${f1(aPrev.final.mean)} → ${f1(aNow.final.mean)}` : "Requiere una evaluación anterior del mismo centro y guía",
    formula: "((Calificación final media t − t−1) ÷ t−1) × 100", frequency: "Por evaluación / pulso semestral",
    source: "Calificaciones finales de ambos periodos", thresholds: "Verde ≤ −10% · Amarillo −10% a 0% · Rojo > 0%", dir: "lower", g: -9.99, y: 0 });
  const hiNow = pct(aNow.final.distribution.ALTO + aNow.final.distribution.MUY_ALTO, aNow.n);
  const hiPrev = aPrev ? pct(aPrev.final.distribution.ALTO + aPrev.final.distribution.MUY_ALTO, aPrev.n) : null;
  const trpa = hiPrev && hiNow !== null ? ((hiPrev - hiNow) / hiPrev) * 100 : null;
  push({ id: "EI-02", dim: 4, name: "Tasa de Reducción de Población en Riesgo Alto", short: "TRPA", type: "Impacto", scope: "encuesta",
    value: trpa, display: f1(trpa, "%"), detail: aPrev ? `Alto+ ${f1(hiPrev, "%")} → ${f1(hiNow, "%")}` : "Requiere una evaluación anterior",
    formula: "((% Alto+ t−1 − % Alto+ t) ÷ % Alto+ t−1) × 100", frequency: "Por evaluación / semestral",
    source: "Calificaciones finales individuales de ambos periodos", thresholds: "Verde ≥ 20% · Amarillo 0–19% · Rojo < 0%", dir: "higher", g: 20, y: 0 });
  let edi: number | null = null, ediDetail = "Requiere evaluación anterior con acciones del programa registradas";
  if (aPrev && intervention && intervention.prevActions.length) {
    const targeted = new Set(intervention.prevActions.map((a) => a.domain));
    const delta = (d: string) => (hiShare(prevSc!, d) ?? 0) - (hiShare(sc, d) ?? 0);
    const ti = Object.keys(g.domains).filter((d) => targeted.has(d)), ni = Object.keys(g.domains).filter((d) => !targeted.has(d));
    if (ti.length && ni.length) {
      const mi = ti.reduce((a, d) => a + delta(d), 0) / ti.length, mn = ni.reduce((a, d) => a + delta(d), 0) / ni.length;
      edi = mi - mn;
      ediDetail = `Mejora en dominios intervenidos ${f1(mi)} pp vs no intervenidos ${f1(mn)} pp`;
    }
  }
  push({ id: "EI-03", dim: 4, name: "Efectividad Diferencial de la Intervención", short: "EDI", type: "Impacto", scope: "encuesta",
    value: edi, display: edi === null ? "—" : `${edi > 0 ? "+" : ""}${f1(edi)} pp`, detail: ediDetail,
    formula: "Δ % Alto+ en dominios intervenidos − Δ % Alto+ en dominios no intervenidos", frequency: "Por evaluación",
    source: "Distribución por dominio de ambos periodos + acciones del programa", thresholds: "Verde ≥ 5 pp · Amarillo 0–4.9 pp · Rojo < 0 pp", dir: "higher", g: 5, y: 0 });

  const iv = intervention;
  const tr = iv?.trainings.filter((t) => t.preScore !== null && t.postScore !== null && t.attendees > 0) ?? [];
  const wPre = tr.reduce((a, t) => a + t.preScore! * t.attendees, 0), wPost = tr.reduce((a, t) => a + t.postScore! * t.attendees, 0), wN = tr.reduce((a, t) => a + t.attendees, 0);
  const gna = wN && wPre / wN < 100 ? (wPost / wN - wPre / wN) / (100 - wPre / wN) : null;
  push({ id: "EI-04", dim: 4, name: "Ganancia Normalizada de Aprendizaje", short: "GNA", type: "Efectividad", scope: "centro",
    value: gna, display: f2(gna), detail: tr.length ? `${tr.length} capacitaciones evaluadas · pre ${f1(wPre / wN)} → post ${f1(wPost / wN)}` : "Registra capacitaciones con evaluación pre y post",
    formula: "(Promedio post − Promedio pre) ÷ (100 − Promedio pre)", frequency: "Por evento; consolidado trimestral",
    source: "Módulo de capacitaciones", thresholds: "Verde ≥ 0.50 · Amarillo 0.30–0.49 · Rojo < 0.30", dir: "higher", g: 0.5, y: 0.3 });
  // Cobertura focalizada: áreas con calificación final Alto+
  const hiAreas = Object.entries(areas).filter(([k, v]) => k !== "Sin dato" && v.length >= minGroup && ["ALTO", "MUY_ALTO"].includes(aggregate(guide, v).final.level)).map(([k, v]) => ({ k, n: v.length }));
  let cfc: number | null = null, cfcDetail = "Ninguna área con calificación final Alto+";
  if (hiAreas.length && iv) {
    const scale = N ? Math.max(1, headcount / N) : 1;
    const ah = opts.areaHeadcount ?? {};
    const exact = hiAreas.every((x) => ah[x.k] > 0);
    const plant = hiAreas.reduce((a, x) => a + (ah[x.k] > 0 ? ah[x.k] : x.n * scale), 0);
    const trained = iv.trainings.filter((t) => t.area && hiAreas.some((h) => h.k === t.area)).reduce((a, t) => a + t.attendees, 0);
    cfc = Math.min(100, (trained / plant) * 100);
    cfcDetail = `${trained} capacitados en ${hiAreas.map((h) => h.k).join(", ")} · plantilla ${exact ? "" : "estimada "}${Math.round(plant)}`;
  }
  push({ id: "EI-05", dim: 4, name: "Cobertura Focalizada de Capacitación", short: "CFC", type: "Efectividad", scope: "centro",
    value: cfc, display: f1(cfc, "%"), detail: cfcDetail,
    formula: "(capacitados de áreas con calificación final Alto+ ÷ plantilla de esas áreas) × 100", frequency: "Trimestral",
    source: "Capacitaciones por área + resultados por área + plantilla", thresholds: "Verde ≥ 80% · Amarillo 50–79% · Rojo < 50%", dir: "higher", g: 80, y: 50 });
  const due = iv?.complaints.filter((c) => days(c.receivedAt, today) >= 30) ?? [];
  const onTime = due.filter((c) => c.closedAt && days(c.receivedAt, c.closedAt) <= 30).length;
  const troq = pct(onTime, due.length);
  const closed = iv?.complaints.filter((c) => c.closedAt) ?? [];
  const avgDays = closed.length ? closed.reduce((a, c) => a + days(c.receivedAt, c.closedAt!), 0) / closed.length : null;
  push({ id: "EI-06", dim: 4, name: "Tasa de Resolución Oportuna de Quejas", short: "TROQ", type: "Efectividad", scope: "centro",
    value: troq, display: f1(troq, "%"), detail: due.length ? `${onTime} de ${due.length} quejas cerradas en ≤ 30 días · tiempo medio ${f1(avgDays)} días` : "Sin quejas con 30+ días de antigüedad",
    formula: "(quejas cerradas en ≤ 30 días ÷ quejas con antigüedad ≥ 30 días) × 100", frequency: "Mensual",
    source: "Buzón de quejas", thresholds: "Verde ≥ 90% · Amarillo 75–89% · Rojo < 75%", dir: "higher", g: 90, y: 75 });
  const yearAgo = new Date(Date.parse(today) - 365 * 86400000).toISOString().slice(0, 10);
  const violQ = iv?.complaints.filter((c) => c.category === "VIOLENCIA" && c.receivedAt >= yearAgo).length ?? 0;
  const exposed = tevl !== null ? (tevl / 100) * (headcount || N) : null;
  const rsv = !iv || exposed === null ? null : violQ ? exposed / violQ : exposed > 0 ? Infinity : 0;
  push({ id: "EI-07", dim: 4, name: "Razón de Subreporte de Violencia", short: "RSV", type: "Efectividad", scope: "centro",
    value: rsv === Infinity ? 999 : rsv, display: rsv === null ? "—" : rsv === Infinity ? "Sin quejas" : f1(rsv),
    detail: exposed === null ? "—" : `${f1(exposed)} trabajadores expuestos (estimado) · ${violQ} quejas de violencia en 12 meses`,
    formula: "(TEVL ÷ 100 × plantilla) ÷ quejas de violencia en 12 meses", frequency: "Semestral",
    source: "LR-01 + buzón de quejas", thresholds: "Verde ≤ 2 · Amarillo 2.1–5 · Rojo > 5", dir: "lower", g: 2.01, y: 5 });
  const cases = iv?.ats ?? [];
  const oca = cases.length ? pct(cases.filter((c) => c.canalizedAt && days(c.identifiedAt, c.canalizedAt) <= 15).length, cases.length) : null;
  push({ id: "EI-08", dim: 4, name: "Oportunidad de Canalización ATS", short: "OCA", type: "Efectividad", scope: "centro",
    value: oca, display: f1(oca, "%"), detail: cases.length ? `${cases.filter((c) => c.canalizedAt).length} de ${cases.length} casos canalizados (${cases.filter((c) => c.canalizedAt && days(c.identifiedAt, c.canalizedAt) <= 15).length} en ≤ 15 días)` : "Sin casos que requieran valoración",
    formula: "(casos canalizados en ≤ 15 días ÷ casos que requieren valoración) × 100", frequency: "Mensual",
    source: "Guía I + seguimiento confidencial", thresholds: "Verde 100% · Amarillo 90–99% · Rojo < 90%", dir: "higher", g: 100, y: 90 });
  const tca = cases.length ? pct(cases.filter((c) => ["EN_ATENCION", "ATENDIDO"].includes(c.status)).length, cases.length) : null;
  push({ id: "EI-09", dim: 4, name: "Tasa de Cierre de Casos ATS", short: "TCA", type: "Efectividad", scope: "centro",
    value: tca, display: f1(tca, "%"), detail: cases.length ? `${cases.filter((c) => c.status === "ATENDIDO").length} atendidos · ${cases.filter((c) => c.status === "EN_ATENCION").length} en atención · ${cases.filter((c) => c.status === "NO_LOCALIZABLE").length} no localizables` : "Sin casos",
    formula: "(casos atendidos o en atención ÷ casos que requieren valoración) × 100", frequency: "Mensual",
    source: "Seguimiento confidencial", thresholds: "Verde ≥ 90% · Amarillo 70–89% · Rojo < 70%", dir: "higher", g: 90, y: 70 });
  const dueActs = iv?.actions.filter((a) => a.dueDate <= today) ?? [];
  const cpi = dueActs.length ? pct(dueActs.filter((a) => a.doneAt && a.doneAt <= a.dueDate).length, dueActs.length) : null;
  push({ id: "EI-10", dim: 4, name: "Cumplimiento del Programa de Intervención", short: "CPI", type: "Efectividad", scope: "centro",
    value: cpi, display: f1(cpi, "%"), detail: iv?.actions.length ? `${dueActs.filter((a) => a.doneAt && a.doneAt <= a.dueDate).length} de ${dueActs.length} acciones vencidas cerradas a tiempo · ${iv.actions.length} acciones en total` : "Registra las acciones del programa",
    formula: "(acciones concluidas a tiempo ÷ acciones con fecha compromiso ≤ hoy) × 100", frequency: "Mensual",
    source: "Programa de intervención", thresholds: "Verde ≥ 90% · Amarillo 70–89% · Rojo < 70%", dir: "higher", g: 90, y: 70 });

  return out;
}
