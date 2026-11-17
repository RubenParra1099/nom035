"use server";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { DEMO_COOKIE, audit, requireUser } from "@/lib/auth";

/** Enciende o apaga el modo demo (solo usuarios con acceso a demos). Vuelve a la cartera porque la vista cambia de empresas. */
export async function toggleDemoMode() {
  const s = await requireUser();
  if (!s.demoAccess) return;
  const jar = await cookies();
  if (s.demoView) jar.delete(DEMO_COOKIE);
  else jar.set(DEMO_COOKIE, "1", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 12 });
  await audit(s, s.demoView ? "demo:off" : "demo:on", "user", s.uid);
  redirect("/admin");
}

/** Marca o desmarca una empresa como demo. Al cambiar, la empresa pasa a la otra vista y se vuelve a la cartera. */
export async function setCompanyDemo(form: FormData) {
  const s = await requireUser(["SUPERADMIN", "CONSULTOR"]);
  if (!s.demoAccess) return;
  const id = String(form.get("id"));
  const demo = form.get("demo") === "1";
  await db.update(schema.companies).set({ demo }).where(eq(schema.companies.id, id));
  await audit(s, demo ? "demo:mark" : "demo:unmark", "company", id);
  revalidatePath("/admin");
  redirect("/admin");
}
