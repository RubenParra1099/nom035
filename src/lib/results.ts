import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { GUIDES, type GuideId } from "@/lib/nom035/guides";
import { maskConditional, scoreWorker } from "@/lib/nom035/score";
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

/** No se muestran resultados de grupos con menos de este número de personas (protección de anonimato). */
export const MIN_GROUP = 5;

/* ---------------- Tablero interactivo ---------------- */

export const DIMENSIONS: { key: string; label: string }[] = [
  { key: "departamento", label: "Área" },
  { key: "puesto", label: "Puesto" },
  { key: "sexo", label: "Sexo" },
  { key: "edad", label: "Edad" },
  { key: "estadoCivil", label: "Estado civil" },
  { key: "estudios", label: "Estudios" },
  { key: "contratacion", label: "Contratación" },
  { key: "jornada", label: "Jornada" },
  { key: "rotacion", label: "Rotación de turnos" },
  { key: "tiempoPuesto", label: "Antigüedad en el puesto" },
  { key: "experiencia", label: "Experiencia laboral" },
];

export type DashRecord = {
  d: Record<string, string>;
  it: (number | null)[];
  p: Record<string, string>;
  g1: 0 | 1 | 2; // 0 sin acontecimiento, 1 acontecimiento sin criterios, 2 requiere valoración
  cli: boolean | null;
  jefe: boolean | null;
};

/** Datos anónimos por trabajador (sin identificadores, nombres, fechas ni comentarios), en orden aleatorio. */
export async function loadDashboard(evaluationId: string) {
  const ev = await db.query.evaluations.findFirst({
    where: eq(schema.evaluations.id, evaluationId),
    with: { workplace: { with: { company: true, evaluations: true } } },
  });
  if (!ev) return null;
  const g = GUIDES[ev.guide];
  const rows = await db.query.responses.findMany({ where: eq(schema.responses.evaluationId, evaluationId) });
  const toRecord = (r: (typeof rows)[number]): DashRecord => ({
    d: Object.fromEntries(DIMENSIONS.map(({ key }) => [key, r.demographics[key] || "Sin dato"])),
    it: Array.from({ length: g.items }, (_, i) => {
      const v = (r.items as Record<string, number | null>)[i + 1];
      return v === undefined ? null : v;
    }),
    p: Object.fromEntries(Object.entries(r.physical).filter(([, v]) => !!v)) as Record<string, string>,
    g1: r.atsRequires ? 2 : r.atsEvent ? 1 : 0,
    cli: r.servesClients, jefe: r.isBoss,
  });
  const records = rows.map(toRecord);
  for (let i = records.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [records[i], records[j]] = [records[j], records[i]];
  }

  // Evaluaciones anteriores del mismo centro y guía (también anónimas), para comparar periodos con los mismos filtros
  const previous = [];
  for (const pe of ev.workplace.evaluations) {
    if (pe.id === ev.id || pe.guide !== ev.guide || pe.createdAt >= ev.createdAt) continue;
    const pr = await db.query.responses.findMany({ where: eq(schema.responses.evaluationId, pe.id) });
    if (pr.length < MIN_GROUP) continue;
    previous.push({ id: pe.id, name: pe.name, records: pr.map(toRecord) });
  }
  previous.sort((a, b) => b.name.localeCompare(a.name, "es"));

  return {
    evaluation: {
      id: ev.id, name: ev.name, guide: ev.guide, includeGuideI: ev.includeGuideI,
      company: ev.workplace.company.name, workplace: ev.workplace.name, headcount: ev.workplace.headcount,
      companyId: ev.workplace.companyId,
    },
    records,
    previous,
  };
}
