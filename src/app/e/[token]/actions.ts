"use server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { GUIDES } from "@/lib/nom035/guides";
import { saveResponse } from "@/lib/results";

const Payload = z.object({
  demographics: z.record(z.string(), z.string().max(200).nullable()),
  physical: z.record(z.string(), z.string().max(50).nullable()),
  items: z.record(z.string(), z.number().int().min(0).max(4).nullable()),
  servesClients: z.boolean().nullable(),
  isBoss: z.boolean().nullable(),
  g1: z.array(z.boolean().nullable()).length(20),
  contactName: z.string().max(200).nullable(),
  comment: z.string().max(2000).nullable(),
});

export async function submitSurvey(token: string, raw: unknown) {
  const ev = await db.query.evaluations.findFirst({ where: eq(schema.evaluations.token, token) });
  if (!ev || ev.status !== "ABIERTA") return { error: "El cuestionario no está disponible." };
  const p = Payload.safeParse(raw);
  if (!p.success) return { error: "Respuestas incompletas o inválidas." };
  const d = p.data;
  const g = GUIDES[ev.guide];
  if (d.servesClients === null || d.isBoss === null) return { error: "Responda las preguntas de clientes y personal a cargo." };
  for (let n = 1; n <= g.items; n++) {
    const skip = (!d.servesClients && g.clientItems.includes(n)) || (!d.isBoss && g.bossItems.includes(n));
    if (!skip && (d.items[n] === null || d.items[n] === undefined)) return { error: `Falta responder el reactivo ${n}.` };
  }
  const items = Object.fromEntries(Object.entries(d.items).map(([k, v]) => [Number(k), v]));
  await saveResponse(ev.id, ev.guide, {
    submittedAt: new Date(), demographics: d.demographics, physical: d.physical, items,
    servesClients: d.servesClients, isBoss: d.isBoss, g1: ev.includeGuideI ? d.g1 : Array(20).fill(null),
    contactName: d.contactName?.trim() || null, comment: d.comment?.trim() || null,
  }, "EN_LINEA");
  return { ok: true };
}
