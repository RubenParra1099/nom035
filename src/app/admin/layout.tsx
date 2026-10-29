import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { logout } from "../login/actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await requireUser();
  const roleLabel = { SUPERADMIN: "Administrador", CONSULTOR: "Consultor", CLIENTE: "Cliente" }[s.role];
  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3">
          <Link href="/admin" className="font-semibold text-brand-900">NOM-035 <span className="font-normal text-gray-500">· Riesgo psicosocial</span></Link>
          <nav className="flex gap-4 text-sm text-gray-600">
            <Link href="/admin" className="hover:text-gray-900">Empresas</Link>
            {s.role === "SUPERADMIN" && <Link href="/admin/usuarios" className="hover:text-gray-900">Usuarios</Link>}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-gray-600">{s.name} · {roleLabel}</span>
            <form action={logout}><button className="text-gray-500 hover:text-gray-900">Salir</button></form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
