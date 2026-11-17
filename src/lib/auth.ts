import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

const COOKIE = "nom035_session";
/** Preferencia del modo demo (solo tiene efecto para usuarios con acceso a demos). */
export const DEMO_COOKIE = "nom035_demo";
const key = () => new TextEncoder().encode(process.env.AUTH_SECRET || "missing-secret");

export type Session = {
  uid: string; role: "SUPERADMIN" | "CONSULTOR" | "CLIENTE"; companyId: string | null; name: string;
  /** Calculados en cada petición por requireUser (no viajan en el token). */
  demoAccess?: boolean; demoView?: boolean; hiddenCompanies?: string[];
};

export async function createSession(s: Session) {
  const token = await new SignJWT(s).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("12h").sign(key());
  (await cookies()).set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 12 });
}
export async function destroySession() {
  (await cookies()).delete(COOKIE);
}
export async function getSession(): Promise<Session | null> {
  const c = (await cookies()).get(COOKIE)?.value;
  if (!c) return null;
  try {
    const { payload } = await jwtVerify(c, key());
    return payload as unknown as Session;
  } catch {
    return null;
  }
}
export async function requireUser(roles?: Session["role"][]) {
  const s = await getSession();
  if (!s) redirect("/login");
  const u = await db.query.users.findFirst({ where: eq(schema.users.id, s.uid) });
  if (!u || !u.active) redirect("/login");
  if (roles && !roles.includes(u.role)) redirect("/admin");
  // Empresas demo: solo existen para quien tiene acceso a demos y con el modo demo encendido;
  // en modo demo, a la inversa, se ocultan las empresas reales (para presentar sin exponer clientes).
  const demoView = u.demoAccess && (await cookies()).get(DEMO_COOKIE)?.value === "1";
  const all = await db.select({ id: schema.companies.id, demo: schema.companies.demo }).from(schema.companies);
  const hiddenCompanies = all.filter((c) => c.demo !== demoView).map((c) => c.id);
  return { ...s, role: u.role, companyId: u.companyId, demoAccess: u.demoAccess, demoView, hiddenCompanies } satisfies Session;
}
/** CLIENTE solo puede ver su empresa; nadie ve las empresas ocultas por el modo demo. */
export function canSeeCompany(s: Session, companyId: string) {
  if (s.hiddenCompanies?.includes(companyId)) return false;
  return s.role !== "CLIENTE" || s.companyId === companyId;
}
export const canEdit = (s: Session) => s.role !== "CLIENTE";
export async function audit(s: Session | null, action: string, entity: string, entityId?: string) {
  await db.insert(schema.auditLogs).values({ userId: s?.uid ?? null, action, entity, entityId });
}
