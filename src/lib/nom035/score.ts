import { ANSWERS, GUIDES, GuideDef, GuideId, Level, LEVELS, levelFor } from "./guides";

/** Respuestas de un trabajador: número de reactivo → índice 0..4 (0 = Siempre … 4 = Nunca). */
export type ItemAnswers = Record<number, number | null | undefined>;

export function answerIndex(text: unknown): number | null {
  if (text === null || text === undefined) return null;
  const t = String(text).trim().toLowerCase();
  const i = ANSWERS.findIndex((a) => a.toLowerCase() === t);
  return i >= 0 ? i : null;
}

/** Valor de un reactivo (0..4) según su dirección de calificación. */
export function itemValue(g: GuideDef, n: number, idx: number | null | undefined): number {
  if (idx === null || idx === undefined) return 0;
  // idx 0=Siempre: directo vale 4, inverso vale 0
  return g.inverse.has(n) ? idx : 4 - idx;
}

/** Anula los reactivos condicionados cuando el filtro es "No" (aunque el formulario los haya recibido). */
export function maskConditional(guide: GuideId, items: ItemAnswers, servesClients: boolean | null, isBoss: boolean | null): ItemAnswers {
  const g = GUIDES[guide];
  const out: ItemAnswers = {};
  for (let n = 1; n <= g.items; n++) out[n] = items[n] ?? null;
  if (servesClients === false) g.clientItems.forEach((n) => (out[n] = null));
  if (isBoss === false) g.bossItems.forEach((n) => (out[n] = null));
  return out;
}

export interface ScoreResult {
  final: number;
  finalLevel: Level;
  categories: Record<string, number>;
  categoryLevels: Record<string, Level>;
  domains: Record<string, number>;
  domainLevels: Record<string, Level>;
}

export function scoreWorker(guide: GuideId | GuideDef, answers: ItemAnswers): ScoreResult {
  const g = typeof guide === "string" ? GUIDES[guide] : guide;
  const val = (n: number) => itemValue(g, n, answers[n]);
  const domains: Record<string, number> = {};
  for (const [d, items] of Object.entries(g.domains)) domains[d] = items.reduce((s, n) => s + val(n), 0);
  const categories: Record<string, number> = {};
  for (const [c, ds] of Object.entries(g.categories)) categories[c] = ds.reduce((s, d) => s + domains[d], 0);
  const final = Object.values(categories).reduce((a, b) => a + b, 0);
  return {
    final,
    finalLevel: levelFor(final, g.finalCuts),
    categories,
    categoryLevels: Object.fromEntries(Object.entries(categories).map(([c, v]) => [c, levelFor(v, g.categoryCuts[c])])),
    domains,
    domainLevels: Object.fromEntries(Object.entries(domains).map(([d, v]) => [d, levelFor(v, g.domainCuts[d])])),
  };
}

export interface AggregateResult {
  n: number;
  final: { mean: number; level: Level; distribution: Record<Level, number> };
  categories: { name: string; mean: number; level: Level; distribution: Record<Level, number> }[];
  domains: { name: string; category: string; mean: number; level: Level; distribution: Record<Level, number> }[];
}

const emptyDist = () => Object.fromEntries(LEVELS.map((l) => [l, 0])) as Record<Level, number>;
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Resultado del centro de trabajo: promedio de las calificaciones individuales + distribución de trabajadores por nivel. */
export function aggregate(guide: GuideId, results: ScoreResult[]): AggregateResult {
  const g = GUIDES[guide];
  const finalDist = emptyDist();
  results.forEach((r) => finalDist[r.finalLevel]++);
  const fm = mean(results.map((r) => r.final));
  const domCat: Record<string, string> = {};
  for (const [c, ds] of Object.entries(g.categories)) ds.forEach((d) => (domCat[d] = c));
  return {
    n: results.length,
    final: { mean: fm, level: levelFor(fm, g.finalCuts), distribution: finalDist },
    categories: Object.keys(g.categories).map((c) => {
      const dist = emptyDist();
      results.forEach((r) => dist[r.categoryLevels[c]]++);
      const m = mean(results.map((r) => r.categories[c]));
      return { name: c, mean: m, level: levelFor(m, g.categoryCuts[c]), distribution: dist };
    }),
    domains: Object.keys(g.domains).map((d) => {
      const dist = emptyDist();
      results.forEach((r) => dist[r.domainLevels[d]]++);
      const m = mean(results.map((r) => r.domains[d]));
      return { name: d, category: domCat[d], mean: m, level: levelFor(m, g.domainCuts[d]), distribution: dist };
    }),
  };
}

/** Tamaño de muestra (numeral 7.6 / Guía): n = 0.9604·N / (0.0025·(N−1) + 0.9604). */
export function sampleSize(N: number): number {
  if (N <= 0) return 0;
  return Math.ceil((0.9604 * N) / (0.0025 * (N - 1) + 0.9604));
}

/** Qué guía corresponde según el número de trabajadores del centro. */
export function requiredGuide(N: number): GuideId | null {
  if (N > 50) return "GUIA_III";
  if (N > 15) return "GUIA_II";
  return null; // ≤15: solo Guía I y política
}
