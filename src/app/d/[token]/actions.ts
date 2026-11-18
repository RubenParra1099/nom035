"use server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";

/** Acuse público de una campaña de difusión (sin sesión). */
export async function acknowledge(_: unknown, form: FormData): Promise<{ ok: boolean; error?: string }> {
  const p = z.object({ token: z.string().min(6).max(64), name: z.string().trim().min(2, "Escriba su nombre o número de empleado").max(120), area: z.string().trim().max(200).optional(), ok: z.literal("on", { message: "Marque la casilla de confirmación" }) })
    .safeParse({ token: form.get("token"), name: form.get("name"), area: form.get("area") || undefined, ok: form.get("ok") });
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Datos incompletos" };
  const d = await db.query.disseminations.findFirst({ where: eq(schema.disseminations.token, p.data.token) });
  if (!d || !d.active) return { ok: false, error: "Esta difusión ya no recibe confirmaciones." };
  const [dup] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.disseminationAcks)
    .where(and(eq(schema.disseminationAcks.disseminationId, d.id), sql`lower(${schema.disseminationAcks.name}) = lower(${p.data.name})`));
  if (!dup.n) await db.insert(schema.disseminationAcks).values({ disseminationId: d.id, name: p.data.name, area: p.data.area });
  return { ok: true };
}
