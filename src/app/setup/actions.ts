"use server";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { audit, createSession } from "@/lib/auth";

/** Crea el primer administrador. Solo funciona mientras no exista ningún usuario. */
export async function createFirstAdmin(_: unknown, form: FormData) {
  const d = z.object({
    name: z.string().trim().min(2, "Escribe tu nombre."),
    email: z.string().trim().toLowerCase().email("Correo no válido."),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
    confirm: z.string(),
  }).safeParse(Object.fromEntries(form));
  if (!d.success) return { error: d.error.issues[0].message };
  if (d.data.password !== d.data.confirm) return { error: "Las contraseñas no coinciden." };

  const created = await db.transaction(async (tx) => {
    await tx.execute(sql`lock table ${schema.users} in exclusive mode`);
    const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(schema.users);
    if (n > 0) return null;
    const [u] = await tx.insert(schema.users).values({
      name: d.data.name, email: d.data.email, role: "SUPERADMIN", passwordHash: await bcrypt.hash(d.data.password, 10),
    }).returning();
    return u;
  });
  if (!created) redirect("/login");
  const s = { uid: created.id, role: created.role, companyId: null, name: created.name };
  await createSession(s);
  await audit(s, "setup", "user", created.id);
  redirect("/admin");
}
