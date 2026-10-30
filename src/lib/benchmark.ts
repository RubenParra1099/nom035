import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Session } from "@/lib/auth";
import { C, GUIDES, LEVELS, type GuideId, type Level } from "@/lib/nom035/guides";
import { aggregate, scoreWorker } from "@/lib/nom035/score";
import { computeKpis } from "@/lib/nom035/kpis";
import { wilson } from "@/lib/nom035/stats";
import { MIN_GROUP } from "@/lib/results";

/** Índice 0–5 (nivel + fracción dentro de su banda): compara categorías de Guía II y III en la misma escala. */
export function riskIndex(v: number, cuts: readonly number[], max: number) {
  const edges = [0, ...cuts, Math.max(max, cuts[3] + 1)];
  for (let i = 0; i < 5; i++) if (v < edges[i + 1] || i === 4) return Math.min(5, i + Math.max(0, (v - edges[i]) / (edges[i + 1] - edges[i])));
  return 5;
}

/** Indicadores comparables entre guías (porcentajes o índices 0–100). */
export const BENCH_KPIS = ["LR-01", "LR-02", "LR-03", "CC-01", "CC-02", "CC-03", "CC-04", "EO-04"] as const;

export type BenchRow = {
  workplaceId: string; workplace: string; companyId: string; company: string; sector: string | null;
  evaluationId: string; evaluation: string; guide: GuideId; n: number; headcount: number;
  final: number; finalLevel: Level; hi: number; hiCi: [number, number] | null;
  categories: Record<string, { idx: number; level: Level }>;
  kpis: Record<string, { value: number | null; display: string; light: string; name: string; short: string }>;
};

/** Evaluación más reciente con al menos MIN_GROUP respuestas de cada centro de trabajo (de todos los clientes). */
export async function loadBenchmark(): Promise<BenchRow[]> {
  const wps = await db.query.workplaces.findMany({ with: { company: true, evaluations: true } });
  const out: BenchRow[] = [];
  for (const w of wps) {
    for (const ev of [...w.evaluations].sort((a, b) => +b.createdAt - +a.createdAt)) {
      const rows = await db.query.responses.findMany({ where: eq(schema.responses.evaluationId, ev.id), columns: { items: true, demographics: true, atsRequires: true, atsEvent: true } });
      if (rows.length < MIN_GROUP) continue;
      const g = GUIDES[ev.guide];
      const recs = rows.map((r) => ({
        d: Object.fromEntries(Object.entries(r.demographics).map(([k, v]) => [k, v ?? "Sin dato"])),
        it: Array.from({ length: g.items }, (_, i) => (r.items as Record<string, number | null>)[i + 1] ?? null),
        g1: (r.atsRequires ? 2 : r.atsEvent ? 1 : 0) as 0 | 1 | 2,
      }));
      const sc = recs.map((r) => scoreWorker(ev.guide, Object.fromEntries(r.it.map((v, i) => [i + 1, v]))));
      const a = aggregate(ev.guide, sc);
      const hiN = a.final.distribution.ALTO + a.final.distribution.MUY_ALTO;
      const maxCat = (c: string) => g.categories[c].reduce((t, d) => t + g.domains[d].length * 4, 0);
      const kp = computeKpis({ guide: ev.guide, records: recs, headcount: w.headcount, minGroup: MIN_GROUP });
      out.push({
        workplaceId: w.id, workplace: w.name, companyId: w.companyId, company: w.company.name, sector: w.company.sector,
        evaluationId: ev.id, evaluation: ev.name, guide: ev.guide, n: rows.length, headcount: w.headcount,
        final: a.final.mean, finalLevel: a.final.level, hi: (hiN / a.n) * 100, hiCi: wilson(hiN, a.n, w.headcount || undefined),
        categories: Object.fromEntries(a.categories.map((c) => [c.name, { idx: riskIndex(c.mean, g.categoryCuts[c.name], maxCat(c.name)), level: c.level }])),
        kpis: Object.fromEntries(kp.filter((k) => (BENCH_KPIS as readonly string[]).includes(k.id)).map((k) => [k.id, { value: k.value, display: k.display, light: k.light, name: k.name, short: k.short }])),
      });
      break;
    }
  }
  return out;
}

export const CATEGORY_ORDER = [C.AMB, C.FACT, C.ORG, C.LYR, C.ENT];
export const levelOfIndex = (idx: number): Level => LEVELS[Math.min(4, Math.floor(idx))];

export function quantiles(values: number[]) {
  const v = [...values].sort((a, b) => a - b);
  const q = (p: number) => {
    if (!v.length) return NaN;
    const i = (v.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i);
    return v[lo] + (v[hi] - v[lo]) * (i - lo);
  };
  return { min: v[0], p25: q(0.25), med: q(0.5), p75: q(0.75), max: v[v.length - 1], mean: v.reduce((a, b) => a + b, 0) / (v.length || 1), n: v.length };
}

/** Lo que un usuario CLIENTE puede ver: sus centros con nombre y el resto como referencia anónima. */
export function scopeFor(s: Session, rows: BenchRow[]) {
  if (s.role !== "CLIENTE") return { rows, own: new Set(rows.map((r) => r.workplaceId)), anonymous: false };
  return { rows, own: new Set(rows.filter((r) => r.companyId === s.companyId).map((r) => r.workplaceId)), anonymous: true };
}
