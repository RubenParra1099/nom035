import { requireUser } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import { logout } from "../login/actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await requireUser();
  const roleLabel = { SUPERADMIN: "Administrador", CONSULTOR: "Consultor", CLIENTE: "Cliente" }[s.role];
  return <AppShell user={s.name} role={roleLabel} isAdmin={s.role === "SUPERADMIN"} logout={logout}>{children}</AppShell>;
}
