import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";

export const GENERAL_NAME = "Todos los centros de trabajo";

/** Plantilla de una evaluación general: suma de los centros de la estructura y sus áreas (por nombre). */
export async function generalTemplate(companyId: string) {
  const company = await db.query.companies.findFirst({
    where: eq(schema.companies.id, companyId),
    with: { workplaces: { where: eq(schema.workplaces.general, false) } },
  });
  if (!company) return null;
  const ids = company.workplaces.map((w) => w.id);
  const areaRows = ids.length ? await db.query.workplaceAreas.findMany({ where: inArray(schema.workplaceAreas.workplaceId, ids) }) : [];
  const areas = new Map<string, { name: string; headcount: number }>();
  for (const a of areaRows) {
    const k = a.name.trim().toLowerCase();
    const prev = areas.get(k);
    areas.set(k, { name: prev?.name ?? a.name.trim(), headcount: (prev?.headcount ?? 0) + a.headcount });
  }
  const sum = company.workplaces.reduce((t, w) => t + w.headcount, 0);
  return {
    company,
    headcount: sum || company.headcount || 0,
    areas: [...areas.values()].sort((x, y) => y.headcount - x.headcount || x.name.localeCompare(y.name, "es")),
  };
}

/** Devuelve (o crea) el contenedor de evaluaciones generales de la empresa. */
export async function generalWorkplace(companyId: string) {
  const found = await db.query.workplaces.findFirst({
    where: and(eq(schema.workplaces.companyId, companyId), eq(schema.workplaces.general, true)),
  });
  if (found) return found;
  const [w] = await db.insert(schema.workplaces).values({ companyId, name: GENERAL_NAME, headcount: 0, general: true }).returning();
  return w;
}
