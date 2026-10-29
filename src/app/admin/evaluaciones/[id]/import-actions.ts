"use server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { audit, requireUser } from "@/lib/auth";
import { saveResponse } from "@/lib/results";
import type { NormalizedResponse } from "@/lib/nom035/importer";

export async function importResponses(evaluationId: string, guide: string, rows: NormalizedResponse[]) {
  const s = await requireUser(["SUPERADMIN", "CONSULTOR"]);
  const ev = await db.query.evaluations.findFirst({ where: eq(schema.evaluations.id, evaluationId) });
  if (!ev) return { error: "Evaluación no encontrada." };
  if (ev.guide !== guide) return { error: `El archivo corresponde a ${guide === "GUIA_III" ? "Guía III" : "Guía II"} y la evaluación es ${ev.guide === "GUIA_III" ? "Guía III" : "Guía II"}.` };
  if (rows.length > 500) return { error: "Envía como máximo 500 filas por lote." };
  for (const r of rows) {
    await saveResponse(evaluationId, ev.guide, { ...r, submittedAt: r.submittedAt ? new Date(r.submittedAt) : null }, "IMPORTACION");
  }
  await audit(s, `import:${rows.length}`, "evaluation", evaluationId);
  revalidatePath(`/admin/evaluaciones/${evaluationId}`);
  return { ok: rows.length };
}
