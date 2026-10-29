"use server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { createSession, destroySession, audit } from "@/lib/auth";

export async function login(_: unknown, form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const u = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  if (!u || !u.active || !(await bcrypt.compare(password, u.passwordHash))) return { error: "Correo o contraseña incorrectos." };
  const s = { uid: u.id, role: u.role, companyId: u.companyId, name: u.name };
  await createSession(s);
  await audit(s, "login", "user", u.id);
  redirect("/admin");
}
export async function logout() {
  await destroySession();
  redirect("/login");
}
