import { canDownload, requireUser } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import { DownloadsProvider } from "@/components/Downloads";
import { alertCount } from "@/lib/alerts";
import { logout } from "../login/actions";
import { toggleDemoMode } from "./demo-actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await requireUser();
  const roleLabel = { SUPERADMIN: "Administrador", CONSULTOR: "Consultor", CLIENTE: "Cliente", CLIENTE_PRUEBA: "Cliente de prueba" }[s.role];
  const alerts = await alertCount(s);
  return <DownloadsProvider allowed={canDownload(s)}>
    <AppShell user={s.name} role={roleLabel} isAdmin={s.role === "SUPERADMIN"} alerts={alerts} logout={logout}
      demo={s.demoAccess ? { on: !!s.demoView, toggle: toggleDemoMode } : undefined}>{children}</AppShell>
  </DownloadsProvider>;
}
