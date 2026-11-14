"use server";
import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { audit, requireUser } from "@/lib/auth";

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");
const opt = (v: FormDataEntryValue | null) => (v === null || String(v).trim() === "" ? undefined : String(v).trim());

/* ---------- Buzón de quejas ---------- */
export async function addComplaint(form: FormData) {
  const s = await requireUser(["SUPERADMIN", "CONSULTOR"]);
  const d = z.object({
    workplaceId: z.string(), receivedAt: dateStr, category: z.enum(["VIOLENCIA", "ENTORNO", "CARGA", "OTRO"]),
    area: z.string().optional(), channel: z.string().optional(),
  }).parse({ workplaceId: form.get("workplaceId"), receivedAt: form.get("receivedAt"), category: form.get("category"), area: opt(form.get("area")), channel: opt(form.get("channel")) });
  const [c] = await db.insert(schema.complaints).values(d).returning();
  await audit(s, "create", "complaint", c.id);
  revalidatePath(`/admin/centros/${d.workplaceId}`);
}
export async function updateComplaint(form: FormData) {
  const s = await requireUser(["SUPERADMIN", "CONSULTOR"]);
  const id = String(form.get("id"));
  const status = z.enum(["RECIBIDA", "EN_INVESTIGACION", "CERRADA"]).parse(form.get("status"));
  const closedAt = status === "CERRADA" ? dateStr.parse(opt(form.get("closedAt")) ?? new Date().toISOString().slice(0, 10)) : null;
  const [c] = await db.update(schema.complaints).set({ status, closedAt, resolution: opt(form.get("resolution")) ?? null }).where(eq(schema.complaints.id, id)).returning();
  await audit(s, `status:${status}`, "complaint", id);
  revalidatePath(`/admin/centros/${c.workplaceId}`);
}
export async function deleteComplaint(form: FormData) {
  const s = await requireUser(["SUPERADMIN", "CONSULTOR"]);
  const [c] = await db.delete(schema.complaints).where(eq(schema.complaints.id, String(form.get("id")))).returning();
  await audit(s, "delete", "complaint", c?.id);
  if (c) revalidatePath(`/admin/centros/${c.workplaceId}`);
}

/* ---------- Capacitaciones ---------- */
export async function addTraining(form: FormData) {
  const s = await requireUser(["SUPERADMIN", "CONSULTOR"]);
  const score = z.coerce.number().min(0).max(100).optional();
  const d = z.object({
    workplaceId: z.string(), title: z.string().min(2), topic: z.enum(["POLITICA", "VIOLENCIA", "LIDERAZGO", "CARGA", "OTRO"]),
    heldAt: dateStr, area: z.string().optional(), attendees: z.coerce.number().int().min(0), preScore: score, postScore: score,
  }).parse({
    workplaceId: form.get("workplaceId"), title: form.get("title"), topic: form.get("topic"), heldAt: form.get("heldAt"),
    area: opt(form.get("area")), attendees: form.get("attendees"), preScore: opt(form.get("preScore")), postScore: opt(form.get("postScore")),
  });
  const [t] = await db.insert(schema.trainings).values(d).returning();
  await audit(s, "create", "training", t.id);
  revalidatePath(`/admin/centros/${d.workplaceId}`);
}
export async function deleteTraining(form: FormData) {
  const s = await requireUser(["SUPERADMIN", "CONSULTOR"]);
  const [t] = await db.delete(schema.trainings).where(eq(schema.trainings.id, String(form.get("id")))).returning();
  await audit(s, "delete", "training", t?.id);
  if (t) revalidatePath(`/admin/centros/${t.workplaceId}`);
}

/* ---------- Programa de intervención ---------- */
export async function addAction(form: FormData) {
  const s = await requireUser(["SUPERADMIN", "CONSULTOR"]);
  const d = z.object({
    evaluationId: z.string(), domain: z.string().min(2), action: z.string().min(3), area: z.string().optional(),
    owner: z.string().optional(), dueDate: dateStr,
  }).parse({
    evaluationId: form.get("evaluationId"), domain: form.get("domain"), action: form.get("action"), area: opt(form.get("area")),
    owner: opt(form.get("owner")), dueDate: form.get("dueDate"),
  });
  const [a] = await db.insert(schema.planActions).values(d).returning();
  await audit(s, "create", "plan_action", a.id);
  revalidatePath(`/admin/evaluaciones/${d.evaluationId}/programa`);
}
export async function setActionDone(form: FormData) {
  const s = await requireUser(["SUPERADMIN", "CONSULTOR"]);
  const id = String(form.get("id"));
  const doneAt = opt(form.get("doneAt")) ? dateStr.parse(opt(form.get("doneAt"))) : null;
  const [a] = await db.update(schema.planActions).set({ doneAt }).where(eq(schema.planActions.id, id)).returning();
  await audit(s, doneAt ? "done" : "reopen", "plan_action", id);
  revalidatePath(`/admin/evaluaciones/${a.evaluationId}/programa`);
}
export async function deleteAction(form: FormData) {
  const s = await requireUser(["SUPERADMIN", "CONSULTOR"]);
  const [a] = await db.delete(schema.planActions).where(eq(schema.planActions.id, String(form.get("id")))).returning();
  await audit(s, "delete", "plan_action", a?.id);
  if (a) revalidatePath(`/admin/evaluaciones/${a.evaluationId}/programa`);
}

/* ---------- Seguimiento de casos ATS ---------- */
export async function updateAts(form: FormData) {
  const s = await requireUser(["SUPERADMIN", "CONSULTOR"]);
  const id = String(form.get("id"));
  const status = z.enum(["IDENTIFICADO", "CANALIZADO", "EN_ATENCION", "ATENDIDO", "NO_LOCALIZABLE"]).parse(form.get("status"));
  const canalizedAt = opt(form.get("canalizedAt")) ? dateStr.parse(opt(form.get("canalizedAt"))) : null;
  const today = new Date().toISOString().slice(0, 10);
  await db.update(schema.atsFollowups).set({
    status,
    canalizedAt: canalizedAt ?? (["CANALIZADO", "EN_ATENCION", "ATENDIDO"].includes(status) ? today : null),
    closedAt: status === "ATENDIDO" ? today : null,
    institution: opt(form.get("institution")) ?? null,
    notes: opt(form.get("notes")) ?? null,
  }).where(eq(schema.atsFollowups.id, id));
  await audit(s, `ats:${status}`, "ats_followup", id);
  revalidatePath(String(form.get("path") ?? "/admin"));
}

/* ---------- Plantilla por área ---------- */
export async function saveAreas(form: FormData) {
  const s = await requireUser(["SUPERADMIN", "CONSULTOR"]);
  const workplaceId = String(form.get("workplaceId"));
  const names = form.getAll("areaName").map((v) => String(v).trim());
  const counts = form.getAll("areaHeadcount").map((v) => String(v).trim());
  const extra = opt(form.get("newArea"));
  const extraHc = opt(form.get("newHeadcount"));
  const rows = names.map((name, i) => ({ name, headcount: counts[i] }));
  if (extra) rows.push({ name: extra, headcount: extraHc ?? "0" });
  for (const r of rows) {
    if (!r.name) continue;
    if (r.headcount === "") {
      await db.delete(schema.workplaceAreas).where(and(eq(schema.workplaceAreas.workplaceId, workplaceId), eq(schema.workplaceAreas.name, r.name)));
      continue;
    }
    const headcount = z.coerce.number().int().min(0).parse(r.headcount);
    await db.insert(schema.workplaceAreas).values({ workplaceId, name: r.name, headcount })
      .onConflictDoUpdate({ target: [schema.workplaceAreas.workplaceId, schema.workplaceAreas.name], set: { headcount } });
  }
  // Las evaluaciones aún no cerradas toman la plantilla corregida.
  const plantilla = Object.fromEntries((await db.query.workplaceAreas.findMany({ where: eq(schema.workplaceAreas.workplaceId, workplaceId) })).map((a) => [a.name, a.headcount]));
  await db.update(schema.evaluations).set({ areaHeadcount: Object.keys(plantilla).length ? plantilla : null })
    .where(and(eq(schema.evaluations.workplaceId, workplaceId), ne(schema.evaluations.status, "CERRADA")));
  await audit(s, "update", "workplace_areas", workplaceId);
  revalidatePath(`/admin/centros/${workplaceId}`);
}

/* ---------- Informe de resultados ---------- */
export async function saveReport(form: FormData) {
  const s = await requireUser(["SUPERADMIN", "CONSULTOR"]);
  const evaluationId = String(form.get("evaluationId"));
  const v = (k: string) => opt(form.get(k)) ?? null;
  const values = {
    activity: v("activity"), objective: v("objective"), activities: v("activities"), conclusions: v("conclusions"),
    responsibleName: v("responsibleName"), responsibleLicense: v("responsibleLicense"),
    reportDate: v("reportDate") ? dateStr.parse(v("reportDate")) : null, updatedAt: new Date(),
  };
  await db.insert(schema.evaluationReports).values({ evaluationId, ...values })
    .onConflictDoUpdate({ target: schema.evaluationReports.evaluationId, set: values });
  await audit(s, "update", "evaluation_report", evaluationId);
  revalidatePath(`/admin/evaluaciones/${evaluationId}/informe`);
}

/* ---------- Políticas de mejora → Programa de intervención ---------- */
export async function addPolicyActions(form: FormData) {
  const s = await requireUser(["SUPERADMIN", "CONSULTOR"]);
  const d = z.object({
    evaluationId: z.string(), domain: z.string().min(2).max(200), area: z.string().max(200).optional(), owner: z.string().max(200).optional(), dueDate: dateStr,
    actions: z.array(z.string().trim().min(3).max(500)).min(1).max(20),
  }).parse({
    evaluationId: form.get("evaluationId"), domain: form.get("domain"), area: opt(form.get("area")), owner: opt(form.get("owner")), dueDate: form.get("dueDate"),
    actions: form.getAll("action").map(String),
  });
  const rows = await db.insert(schema.planActions).values(d.actions.map((action) => ({ evaluationId: d.evaluationId, domain: d.domain, action, area: d.area, owner: d.owner, dueDate: d.dueDate }))).returning();
  await audit(s, "create-from-policy", "plan_action", rows[0]?.id);
  revalidatePath(`/admin/evaluaciones/${d.evaluationId}/programa`);
}

/* ---------- Metas y cumplimiento ---------- */
export async function saveComplianceMark(input: { evaluationId: string; id: string; done: boolean; note?: string }) {
  const s = await requireUser(["SUPERADMIN", "CONSULTOR"]);
  const d = z.object({ evaluationId: z.string(), id: z.enum(["POL", "MED", "QUEJAS", "DIF"]), done: z.boolean(), note: z.string().trim().max(300).optional() }).parse(input);
  const ev = await db.query.evaluations.findFirst({ where: eq(schema.evaluations.id, d.evaluationId), columns: { compliance: true } });
  if (!ev) throw new Error("Evaluación no encontrada");
  const compliance = { ...ev.compliance, [d.id]: { done: d.done, note: d.note || undefined, at: new Date().toISOString().slice(0, 10) } };
  await db.update(schema.evaluations).set({ compliance }).where(eq(schema.evaluations.id, d.evaluationId));
  await audit(s, "update-compliance", "evaluation", d.evaluationId);
  revalidatePath(`/admin/evaluaciones/${d.evaluationId}/indicadores`);
}

export async function saveKpiTargets(input: { evaluationId: string; targets: Record<string, number | null> }) {
  const s = await requireUser(["SUPERADMIN", "CONSULTOR"]);
  const d = z.object({ evaluationId: z.string(), targets: z.record(z.string().regex(/^[A-Z]{2}-\d{2}$/), z.number().finite().min(-1000).max(100000).nullable()) }).parse(input);
  const ev = await db.query.evaluations.findFirst({ where: eq(schema.evaluations.id, d.evaluationId), columns: { kpiTargets: true } });
  if (!ev) throw new Error("Evaluación no encontrada");
  const kpiTargets: Record<string, number> = { ...ev.kpiTargets };
  for (const [k, v] of Object.entries(d.targets)) { if (v === null) delete kpiTargets[k]; else kpiTargets[k] = v; }
  await db.update(schema.evaluations).set({ kpiTargets }).where(eq(schema.evaluations.id, d.evaluationId));
  await audit(s, "update-kpi-targets", "evaluation", d.evaluationId);
  revalidatePath(`/admin/evaluaciones/${d.evaluationId}/indicadores`);
}
