"use server";
import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { createToken } from "@/db/id";
import { audit, requireUser } from "@/lib/auth";
import { requiredGuide } from "@/lib/nom035/score";

const Area = z.object({ name: z.string().trim().min(1).max(120), headcount: z.number().int().min(0).nullable() });
const Centro = z.object({
  id: z.string().optional(), name: z.string().trim().min(2).max(160), address: z.string().trim().max(300).optional().nullable(),
  headcount: z.number().int().min(0), areas: z.array(Area).max(200),
});
const dedupe = <T extends { name: string }>(xs: T[]) => [...new Map(xs.map((x) => [x.name.toLowerCase(), x])).values()];

/** Las evaluaciones que no están cerradas toman la estructura vigente del centro (plantilla, áreas y total). */
async function syncOpenEvaluations(workplaceId: string) {
  const [w, areas] = await Promise.all([
    db.query.workplaces.findFirst({ where: eq(schema.workplaces.id, workplaceId) }),
    db.query.workplaceAreas.findMany({ where: eq(schema.workplaceAreas.workplaceId, workplaceId) }),
  ]);
  if (!w) return;
  const snap = Object.fromEntries(areas.map((a) => [a.name, a.headcount]));
  await db.update(schema.evaluations).set({
    headcount: w.headcount,
    areaHeadcount: areas.length ? snap : null,
    ...(areas.length ? { departments: areas.map((a) => a.name) } : {}),
  }).where(and(eq(schema.evaluations.workplaceId, workplaceId), ne(schema.evaluations.status, "CERRADA")));
}

/** Reemplaza las áreas de un centro por la lista dada. */
async function replaceAreas(workplaceId: string, areas: z.infer<typeof Area>[]) {
  const list = dedupe(areas);
  await db.delete(schema.workplaceAreas).where(eq(schema.workplaceAreas.workplaceId, workplaceId));
  if (list.length) await db.insert(schema.workplaceAreas).values(list.map((a) => ({ workplaceId, name: a.name, headcount: a.headcount ?? 0 })));
}

/** Crea o actualiza un centro de trabajo con su plantilla por área (pestaña Estructura). */
export async function saveCentro(form: FormData) {
  const s = await requireUser(["SUPERADMIN", "CONSULTOR"]);
  const companyId = z.string().parse(form.get("companyId"));
  const c = Centro.parse(JSON.parse(String(form.get("data") ?? "{}")));
  let id = c.id;
  if (id) {
    const [w] = await db.update(schema.workplaces).set({ name: c.name, address: c.address || null, headcount: c.headcount })
      .where(and(eq(schema.workplaces.id, id), eq(schema.workplaces.companyId, companyId))).returning();
    if (!w) throw new Error("Centro no encontrado");
    await audit(s, "update", "workplace", id);
  } else {
    const [w] = await db.insert(schema.workplaces).values({ companyId, name: c.name, address: c.address || null, headcount: c.headcount }).returning();
    id = w.id;
    await audit(s, "create", "workplace", id);
  }
  await replaceAreas(id, c.areas);
  await syncOpenEvaluations(id);
  revalidatePath(`/admin/empresas/${companyId}`);
  revalidatePath(`/admin/centros/${id}`);
}

/** Carga masiva: texto pegado de Excel con Centro · Área · Trabajadores. Crea o actualiza centros por nombre. */
export async function importStructure(form: FormData) {
  const s = await requireUser(["SUPERADMIN", "CONSULTOR"]);
  const companyId = z.string().parse(form.get("companyId"));
  const rows = z.array(z.object({ centro: z.string().trim().min(2), area: z.string().trim().min(1), n: z.number().int().min(0).nullable() }))
    .parse(JSON.parse(String(form.get("rows") ?? "[]")));
  const byCentro = new Map<string, { name: string; areas: { name: string; headcount: number | null }[] }>();
  for (const r of rows) {
    const k = r.centro.toLowerCase();
    if (!byCentro.has(k)) byCentro.set(k, { name: r.centro, areas: [] });
    byCentro.get(k)!.areas.push({ name: r.area, headcount: r.n });
  }
  const existing = await db.query.workplaces.findMany({ where: eq(schema.workplaces.companyId, companyId) });
  for (const c of byCentro.values()) {
    const total = c.areas.reduce((t, a) => t + (a.headcount ?? 0), 0);
    const found = existing.find((w) => w.name.toLowerCase() === c.name.toLowerCase());
    let id = found?.id;
    if (found) await db.update(schema.workplaces).set({ headcount: total || found.headcount }).where(eq(schema.workplaces.id, found.id));
    else id = (await db.insert(schema.workplaces).values({ companyId, name: c.name, headcount: total }).returning())[0].id;
    await replaceAreas(id!, c.areas);
    await syncOpenEvaluations(id!);
  }
  await audit(s, "import", "structure", companyId);
  revalidatePath(`/admin/empresas/${companyId}`);
}

/* ---------- Asistente "Nuevo cliente" ---------- */
const Wizard = z.object({
  company: z.object({ name: z.string().trim().min(2).max(200), rfc: z.string().trim().max(20).optional(), contact: z.string().trim().max(200).optional(), sector: z.string().trim().max(120).optional() }),
  centros: z.array(Centro.extend({ evaluate: z.boolean(), guide: z.enum(["GUIA_II", "GUIA_III"]).optional() })).min(1).max(100),
  evaluation: z.object({ name: z.string().trim().min(2).max(160), includeGuideI: z.boolean(), positions: z.array(z.string().trim().min(1)).max(50), open: z.boolean() }),
});
export type WizardResult = { companyId: string; evaluations: { id: string; name: string; centro: string; token: string; guide: string }[] };

/** Crea en una sola operación la empresa, sus centros con áreas y la primera evaluación de los centros elegidos. */
export async function createClient(input: z.input<typeof Wizard>): Promise<WizardResult> {
  const s = await requireUser(["SUPERADMIN", "CONSULTOR"]);
  const d = Wizard.parse(input);
  return db.transaction(async (tx) => {
    const [c] = await tx.insert(schema.companies).values({ name: d.company.name, rfc: d.company.rfc || null, contact: d.company.contact || null, sector: d.company.sector || null }).returning();
    const out: WizardResult["evaluations"] = [];
    for (const ce of d.centros) {
      const [w] = await tx.insert(schema.workplaces).values({ companyId: c.id, name: ce.name, address: ce.address || null, headcount: ce.headcount }).returning();
      const areas = dedupe(ce.areas);
      if (areas.length) await tx.insert(schema.workplaceAreas).values(areas.map((a) => ({ workplaceId: w.id, name: a.name, headcount: a.headcount ?? 0 })));
      if (ce.evaluate) {
        const guide = ce.guide ?? requiredGuide(ce.headcount) ?? "GUIA_II";
        const snap = Object.fromEntries(areas.filter((a) => a.headcount != null).map((a) => [a.name, a.headcount!]));
        const [e] = await tx.insert(schema.evaluations).values({
          workplaceId: w.id, name: d.evaluation.name, guide, includeGuideI: d.evaluation.includeGuideI, status: d.evaluation.open ? "ABIERTA" : "BORRADOR",
          token: createToken(), departments: areas.map((a) => a.name), positions: d.evaluation.positions,
          headcount: ce.headcount, areaHeadcount: Object.keys(snap).length ? snap : null,
        }).returning();
        out.push({ id: e.id, name: e.name, centro: w.name, token: e.token, guide });
      }
    }
    await tx.insert(schema.auditLogs).values({ userId: s.uid, action: "create-wizard", entity: "company", entityId: c.id });
    return { companyId: c.id, evaluations: out };
  }).finally(() => revalidatePath("/admin"));
}
