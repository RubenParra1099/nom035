import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { GUIDES, type GuideId, type Level } from "@/lib/nom035/guides";
import { aggregate, maskConditional, scoreWorker, type ScoreResult } from "@/lib/nom035/score";
import { evaluateG1 } from "@/lib/nom035/guia1";
import type { NormalizedResponse } from "@/lib/nom035/importer";

/** Calcula y guarda una respuesta (en línea o importada). Los reactivos condicionados se anulan si el filtro es "No". */
export async function saveResponse(
  evaluationId: string, guide: GuideId, r: NormalizedResponse, source: "EN_LINEA" | "IMPORTACION",
) {
  const items = maskConditional(guide, r.items, r.servesClients, r.isBoss) as Record<number, number | null>;
  const sc = scoreWorker(guide, items);
  const ats = evaluateG1(r.g1);
  const [row] = await db.insert(schema.responses).values({
    evaluationId, source,
    submittedAt: r.submittedAt ?? new Date(),
    demographics: r.demographics, physical: r.physical, items,
    servesClients: r.servesClients, isBoss: r.isBoss,
    guideI: r.g1.some((x) => x !== null) ? r.g1 : null,
    atsEvent: ats.event, atsRequires: ats.requiresEvaluation,
    finalScore: sc.final, finalLevel: sc.finalLevel, categories: sc.categories, domains: sc.domains,
    comment: r.comment,
  }).returning({ id: schema.responses.id });
  if (r.contactName) await db.insert(schema.confidentialContacts).values({ responseId: row.id, name: r.contactName });
  return row.id;
}

export type Filters = Partial<Record<"departamento" | "puesto" | "sexo" | "edad" | "jornada" | "contratacion", string>>;
export const FILTER_KEYS: { key: keyof Filters; label: string }[] = [
  { key: "departamento", label: "Área" },
  { key: "puesto", label: "Puesto" },
  { key: "sexo", label: "Sexo" },
  { key: "edad", label: "Edad" },
  { key: "jornada", label: "Jornada" },
  { key: "contratacion", label: "Contratación" },
];
/** No se muestran resultados de grupos con menos de este número de personas (protección de anonimato). */
export const MIN_GROUP = 5;

export async function loadResults(evaluationId: string, filters: Filters = {}) {
  const ev = await db.query.evaluations.findFirst({
    where: eq(schema.evaluations.id, evaluationId),
    with: { workplace: { with: { company: true } } },
  });
  if (!ev) return null;
  const all = await db.query.responses.findMany({ where: eq(schema.responses.evaluationId, evaluationId) });
  const options: Record<string, string[]> = {};
  for (const { key } of FILTER_KEYS)
    options[key] = [...new Set(all.map((r) => r.demographics[key]).filter((v): v is string => !!v))].sort();
  const rows = all.filter((r) => Object.entries(filters).every(([k, v]) => !v || r.demographics[k] === v));
  const g = GUIDES[ev.guide];

  const scores: ScoreResult[] = rows.map((r) => scoreWorker(ev.guide, r.items as Record<number, number | null>));
  const agg = aggregate(ev.guide, scores);

  // Distribución de respuestas por reactivo (índice 0..4) y promedio de puntos
  const itemStats = Array.from({ length: g.items }, (_, i) => {
    const n = i + 1;
    const counts = [0, 0, 0, 0, 0];
    let answered = 0;
    for (const r of rows) {
      const v = (r.items as Record<string, number | null>)[n];
      if (v !== null && v !== undefined) { counts[v]++; answered++; }
    }
    const points = counts.reduce((s, c, idx) => s + c * (g.inverse.has(n) ? idx : 4 - idx), 0);
    return { n, text: g.text(n), counts, answered, mean: answered ? points / answered : 0, inverse: g.inverse.has(n) };
  });

  const demographics: Record<string, Record<string, number>> = {};
  for (const k of ["sexo", "edad", "estadoCivil", "estudios", "departamento", "puesto", "contratacion", "jornada", "rotacion", "tiempoPuesto", "experiencia"]) {
    demographics[k] = {};
    for (const r of rows) {
      const v = r.demographics[k] ?? "Sin dato";
      demographics[k][v] = (demographics[k][v] ?? 0) + 1;
    }
  }
  const physical: Record<string, Record<string, number>> = {};
  for (const r of rows)
    for (const [k, v] of Object.entries(r.physical)) {
      if (!v) continue;
      physical[k] ??= {};
      physical[k][v] = (physical[k][v] ?? 0) + 1;
    }

  // Resultado por área (solo grupos con ≥ MIN_GROUP)
  const byGroup = (key: string) => {
    const groups: Record<string, ScoreResult[]> = {};
    rows.forEach((r, i) => {
      const v = r.demographics[key];
      if (v) (groups[v] ??= []).push(scores[i]);
    });
    return Object.entries(groups).map(([name, sc]) => {
      const a = aggregate(ev.guide, sc);
      return {
        name, n: sc.length, hidden: sc.length < MIN_GROUP,
        final: a.final,
        categories: Object.fromEntries(a.categories.map((c) => [c.name, { mean: c.mean, level: c.level as Level }])),
      };
    }).sort((a, b) => b.final.mean - a.final.mean);
  };

  return {
    evaluation: ev, total: all.length, n: rows.length, agg, itemStats, demographics, physical,
    byDepartment: byGroup("departamento"), byPosition: byGroup("puesto"), options,
    guideI: {
      answered: rows.filter((r) => r.guideI).length,
      event: rows.filter((r) => r.atsEvent).length,
      requires: rows.filter((r) => r.atsRequires).length,
    },
    comments: rows.map((r) => r.comment).filter((c): c is string => !!c && c.length > 3),
  };
}
