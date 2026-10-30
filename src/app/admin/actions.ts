"use server";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { createToken } from "@/db/id";
import { audit, requireUser } from "@/lib/auth";

const lines = (v: FormDataEntryValue | null) =>
  String(v ?? "").split(/\n|,/).map((s) => s.trim()).filter(Boolean);

export async function createCompany(form: FormData) {
  const s = await requireUser(["SUPERADMIN", "CONSULTOR"]);
  const d = z.object({ name: z.string().min(2), rfc: z.string().optional(), contact: z.string().optional(), sector: z.string().optional() })
    .parse({ name: form.get("name"), rfc: form.get("rfc") || undefined, contact: form.get("contact") || undefined, sector: form.get("sector") || undefined });
  const [c] = await db.insert(schema.companies).values(d).returning();
  await audit(s, "create", "company", c.id);
  redirect(`/admin/empresas/${c.id}`);
}

export async function updateCompany(form: FormData) {
  const s = await requireUser(["SUPERADMIN", "CONSULTOR"]);
  const id = String(form.get("id"));
  const d = z.object({ name: z.string().min(2), rfc: z.string().optional(), contact: z.string().optional(), sector: z.string().optional() })
    .parse({ name: form.get("name"), rfc: form.get("rfc") || undefined, contact: form.get("contact") || undefined, sector: form.get("sector") || undefined });
  await db.update(schema.companies).set({ name: d.name, rfc: d.rfc ?? null, contact: d.contact ?? null, sector: d.sector ?? null }).where(eq(schema.companies.id, id));
  await audit(s, "update", "company", id);
  revalidatePath(`/admin/empresas/${id}`);
}

export async function deleteCompany(form: FormData) {
  const s = await requireUser(["SUPERADMIN"]);
  const id = String(form.get("id"));
  await db.delete(schema.companies).where(eq(schema.companies.id, id));
  await audit(s, "delete", "company", id);
  redirect("/admin");
}

export async function createWorkplace(form: FormData) {
  const s = await requireUser(["SUPERADMIN", "CONSULTOR"]);
  const d = z.object({ companyId: z.string(), name: z.string().min(2), address: z.string().optional(), headcount: z.coerce.number().int().min(0) })
    .parse({ companyId: form.get("companyId"), name: form.get("name"), address: form.get("address") || undefined, headcount: form.get("headcount") });
  const [w] = await db.insert(schema.workplaces).values(d).returning();
  await audit(s, "create", "workplace", w.id);
  revalidatePath(`/admin/empresas/${d.companyId}`);
}

/** Elimina un centro de trabajo con sus evaluaciones, respuestas, plantilla por área, quejas, capacitaciones y seguimientos. */
export async function deleteWorkplace(form: FormData) {
  const s = await requireUser(["SUPERADMIN"]);
  const id = String(form.get("id"));
  const [w] = await db.delete(schema.workplaces).where(eq(schema.workplaces.id, id)).returning();
  if (!w) return;
  await audit(s, "delete", "workplace", id);
  revalidatePath(`/admin/empresas/${w.companyId}`);
  revalidatePath("/admin");
}

export async function updateWorkplace(form: FormData) {
  const s = await requireUser(["SUPERADMIN", "CONSULTOR"]);
  const d = z.object({ id: z.string(), name: z.string().trim().min(2), address: z.string().trim().optional(), headcount: z.coerce.number().int().min(0) })
    .parse({ id: form.get("id"), name: form.get("name"), address: form.get("address") || undefined, headcount: form.get("headcount") });
  const [w] = await db.update(schema.workplaces).set({ name: d.name, address: d.address ?? null, headcount: d.headcount })
    .where(eq(schema.workplaces.id, d.id)).returning();
  if (!w) return;
  await audit(s, "update", "workplace", w.id);
  revalidatePath(`/admin/empresas/${w.companyId}`);
  revalidatePath(`/admin/centros/${w.id}`);
}

export async function updateWorkplaceHeadcount(form: FormData) {
  await requireUser(["SUPERADMIN", "CONSULTOR"]);
  const id = String(form.get("id"));
  const headcount = z.coerce.number().int().min(0).parse(form.get("headcount"));
  const [w] = await db.update(schema.workplaces).set({ headcount }).where(eq(schema.workplaces.id, id)).returning();
  revalidatePath(`/admin/empresas/${w.companyId}`);
}

export async function createEvaluation(form: FormData) {
  const s = await requireUser(["SUPERADMIN", "CONSULTOR"]);
  const d = z.object({
    workplaceId: z.string(),
    name: z.string().min(2),
    guide: z.enum(["GUIA_II", "GUIA_III"]),
    includeGuideI: z.boolean(),
  }).parse({
    workplaceId: form.get("workplaceId"), name: form.get("name"), guide: form.get("guide"),
    includeGuideI: form.get("includeGuideI") === "on",
  });
  const [e] = await db.insert(schema.evaluations).values({
    ...d, token: createToken(), departments: lines(form.get("departments")), positions: lines(form.get("positions")),
  }).returning();
  await audit(s, "create", "evaluation", e.id);
  redirect(`/admin/evaluaciones/${e.id}`);
}

export async function updateEvaluation(form: FormData) {
  const s = await requireUser(["SUPERADMIN", "CONSULTOR"]);
  const id = String(form.get("id"));
  await db.update(schema.evaluations).set({
    name: String(form.get("name")),
    departments: lines(form.get("departments")),
    positions: lines(form.get("positions")),
    includeGuideI: form.get("includeGuideI") === "on",
  }).where(eq(schema.evaluations.id, id));
  await audit(s, "update", "evaluation", id);
  revalidatePath(`/admin/evaluaciones/${id}`);
}

export async function setEvaluationStatus(form: FormData) {
  const s = await requireUser(["SUPERADMIN", "CONSULTOR"]);
  const id = String(form.get("id"));
  const status = z.enum(["BORRADOR", "ABIERTA", "CERRADA"]).parse(form.get("status"));
  await db.update(schema.evaluations).set({ status }).where(eq(schema.evaluations.id, id));
  await audit(s, `status:${status}`, "evaluation", id);
  revalidatePath(`/admin/evaluaciones/${id}`);
}

export async function deleteEvaluation(form: FormData) {
  const s = await requireUser(["SUPERADMIN"]);
  const id = String(form.get("id"));
  const e = await db.query.evaluations.findFirst({ where: eq(schema.evaluations.id, id), with: { workplace: true } });
  await db.delete(schema.evaluations).where(eq(schema.evaluations.id, id));
  await audit(s, "delete", "evaluation", id);
  redirect(e ? `/admin/empresas/${e.workplace.companyId}` : "/admin");
}

export async function deleteImportedResponses(form: FormData) {
  const s = await requireUser(["SUPERADMIN", "CONSULTOR"]);
  const id = String(form.get("id"));
  await db.delete(schema.responses).where(and(eq(schema.responses.evaluationId, id), eq(schema.responses.source, "IMPORTACION")));
  await audit(s, "delete-imported", "evaluation", id);
  revalidatePath(`/admin/evaluaciones/${id}`);
}

export async function toggleAttended(form: FormData) {
  const s = await requireUser(["SUPERADMIN", "CONSULTOR"]);
  const id = String(form.get("id"));
  const c = await db.query.confidentialContacts.findFirst({ where: eq(schema.confidentialContacts.id, id) });
  if (!c) return;
  await db.update(schema.confidentialContacts).set({ attended: !c.attended, notes: String(form.get("notes") ?? c.notes ?? "") })
    .where(eq(schema.confidentialContacts.id, id));
  await audit(s, "toggle-attended", "confidential", id);
  revalidatePath(String(form.get("path") ?? "/admin"));
}

export async function createUser(form: FormData) {
  const s = await requireUser(["SUPERADMIN"]);
  const d = z.object({
    email: z.string().email(), name: z.string().min(2), password: z.string().min(8),
    role: z.enum(["SUPERADMIN", "CONSULTOR", "CLIENTE"]), companyId: z.string().optional(),
  }).parse({
    email: String(form.get("email")).toLowerCase().trim(), name: form.get("name"), password: form.get("password"),
    role: form.get("role"), companyId: form.get("companyId") || undefined,
  });
  if (d.role === "CLIENTE" && !d.companyId) redirect(`/admin/usuarios?error=${encodeURIComponent("Un usuario Cliente debe tener empresa.")}`);
  if (await db.query.users.findFirst({ where: eq(schema.users.email, d.email) })) redirect(`/admin/usuarios?error=${encodeURIComponent("Ese correo ya está registrado.")}`);
  const [u] = await db.insert(schema.users).values({
    email: d.email, name: d.name, role: d.role, companyId: d.role === "CLIENTE" ? d.companyId : null,
    passwordHash: await bcrypt.hash(d.password, 10),
  }).returning();
  await audit(s, "create", "user", u.id);
  revalidatePath("/admin/usuarios");
}

/** Solo administradores. La contraseña se cambia únicamente si se captura una nueva. */
export async function updateUser(form: FormData) {
  const s = await requireUser(["SUPERADMIN"]);
  const id = String(form.get("id"));
  const back = (msg: string) => redirect(`/admin/usuarios?edit=${id}&error=${encodeURIComponent(msg)}`);
  const parsed = z.object({
    email: z.string().email(), name: z.string().trim().min(2), password: z.string().min(8).optional(),
    role: z.enum(["SUPERADMIN", "CONSULTOR", "CLIENTE"]), companyId: z.string().optional(),
  }).safeParse({
    email: String(form.get("email") ?? "").toLowerCase().trim(), name: form.get("name"), password: form.get("password") || undefined,
    role: form.get("role"), companyId: form.get("companyId") || undefined,
  });
  if (!parsed.success) back("Revisa los datos: correo válido, nombre de al menos 2 letras y contraseña de al menos 8 caracteres.");
  const d = parsed.data!;
  if (d.role === "CLIENTE" && !d.companyId) back("Un usuario Cliente debe tener empresa.");
  if (id === s.uid && d.role !== "SUPERADMIN") back("No puedes quitarte a ti mismo el rol de Administrador.");
  const dup = await db.query.users.findFirst({ where: eq(schema.users.email, d.email) });
  if (dup && dup.id !== id) back("Ese correo ya está registrado en otro usuario.");
  await db.update(schema.users).set({
    name: d.name, email: d.email, role: d.role, companyId: d.role === "CLIENTE" ? d.companyId : null,
    ...(d.password ? { passwordHash: await bcrypt.hash(d.password, 10) } : {}),
  }).where(eq(schema.users.id, id));
  await audit(s, d.password ? "update+password" : "update", "user", id);
  revalidatePath("/admin/usuarios");
  redirect("/admin/usuarios?ok=1");
}

export async function toggleUser(form: FormData) {
  const s = await requireUser(["SUPERADMIN"]);
  const id = String(form.get("id"));
  if (id === s.uid) return;
  const u = await db.query.users.findFirst({ where: eq(schema.users.id, id) });
  if (!u) return;
  await db.update(schema.users).set({ active: !u.active }).where(eq(schema.users.id, id));
  await audit(s, u.active ? "deactivate" : "activate", "user", id);
  revalidatePath("/admin/usuarios");
}
