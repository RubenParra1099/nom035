/**
 * Estadística para indicadores NOM-035: márgenes de error al 95% y pruebas de cambio entre periodos.
 * Se aplica la corrección por población finita cuando se conoce la plantilla (N), porque en muchos centros
 * se encuesta a una parte grande del total y el margen real es menor que el de una muestra infinita.
 */
const Z = 1.96;

/** Factor de corrección por población finita: √((N − n) ÷ (N − 1)). Sin N (o n ≥ N) devuelve 1 o 0. */
export function fpc(n: number, N?: number) {
  if (!N || N <= 1 || N < n) return 1;
  return Math.sqrt(Math.max(0, (N - n) / (N - 1)));
}

/** Intervalo de Wilson para una proporción (0–100), con corrección por población finita. */
export function wilson(x: number, n: number, N?: number): [number, number] | null {
  if (n <= 0) return null;
  const p = x / n, f = fpc(n, N);
  const z = Z * f;
  if (z === 0) return [p * 100, p * 100];
  const den = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / den;
  const h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / den;
  return [Math.max(0, c - h) * 100, Math.min(1, c + h) * 100];
}

export function meanSd(v: number[]) {
  const n = v.length;
  const m = n ? v.reduce((a, b) => a + b, 0) / n : 0;
  const sd = n > 1 ? Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1)) : 0;
  return { n, m, sd };
}

/** Margen de error (±) de un promedio al 95%. */
export function meanMoe(v: number[], N?: number) {
  const { n, sd } = meanSd(v);
  return n > 1 ? (Z * sd * fpc(n, N)) / Math.sqrt(n) : null;
}

/** Función de distribución normal estándar (aprox. de Abramowitz-Stegun). */
function phi(z: number) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}
const pTwoSided = (z: number) => 2 * (1 - phi(Math.abs(z)));

export type Change = { delta: number; p: number; significant: boolean };

/** Diferencia de dos proporciones (prueba z con varianza combinada). Valores en %. */
export function propChange(x1: number, n1: number, x0: number, n0: number): Change | null {
  if (n1 < 2 || n0 < 2) return null;
  const p1 = x1 / n1, p0 = x0 / n0, pp = (x1 + x0) / (n1 + n0);
  const se = Math.sqrt(pp * (1 - pp) * (1 / n1 + 1 / n0));
  const delta = (p1 - p0) * 100;
  if (se === 0) return { delta, p: delta === 0 ? 1 : 0, significant: delta !== 0 };
  const p = pTwoSided((p1 - p0) / se);
  return { delta, p, significant: p < 0.05 };
}

/** Diferencia de dos promedios (prueba de Welch aproximada a normal; n suele ser > 30). */
export function meanChange(now: number[], before: number[]): Change | null {
  const a = meanSd(now), b = meanSd(before);
  if (a.n < 2 || b.n < 2) return null;
  const se = Math.sqrt((a.sd ** 2) / a.n + (b.sd ** 2) / b.n);
  const delta = a.m - b.m;
  if (se === 0) return { delta, p: delta === 0 ? 1 : 0, significant: delta !== 0 };
  const p = pTwoSided(delta / se);
  return { delta, p, significant: p < 0.05 };
}
