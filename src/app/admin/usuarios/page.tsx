import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { createUser, toggleUser, updateUser } from "../actions";

export const dynamic = "force-dynamic";

const ROLE_LABEL = { SUPERADMIN: "Administrador", CONSULTOR: "Consultor", CLIENTE: "Cliente (solo lectura)" } as const;
const ROLE_HELP = "Administrador: todo, incluidos usuarios y eliminaciones. Consultor: clientes, evaluaciones, análisis y seguimiento; no administra usuarios. Cliente: solo consulta los resultados agregados de su empresa.";

/** Solo administradores: el consultor no ve esta página ni puede dar de alta o editar usuarios. */
export default async function UsersPage({ searchParams }: { searchParams: Promise<{ edit?: string; error?: string; ok?: string }> }) {
  const s = await requireUser(["SUPERADMIN"]);
  const q = await searchParams;
  const users = await db.query.users.findMany({ with: { company: true }, orderBy: [asc(schema.users.name)] });
  const companies = await db.query.companies.findMany({ orderBy: [asc(schema.companies.name)] });
  const editing = q.edit ? users.find((u) => u.id === q.edit) : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Usuarios</h1>
        <p className="text-sm text-gray-500">Solo los administradores pueden dar de alta, editar o desactivar usuarios.</p>
      </div>
      {q.error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{q.error}</div>}
      {q.ok && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">Cambios guardados.</div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card overflow-x-auto lg:col-span-2">
          <table className="w-full">
            <thead className="border-b border-gray-100"><tr><th className="th">Nombre</th><th className="th">Rol</th><th className="th">Empresa</th><th className="th"></th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className={`${u.active ? "" : "opacity-50"} ${editing?.id === u.id ? "bg-brand-50" : ""}`}>
                  <td className="td"><div className="font-medium">{u.name}{u.id === s.uid && <span className="ml-1.5 text-xs font-normal text-gray-400">(tú)</span>}</div><div className="text-xs text-gray-500">{u.email}</div></td>
                  <td className="td">{ROLE_LABEL[u.role]}{!u.active && <div className="text-xs text-gray-500">Inactivo</div>}</td>
                  <td className="td">{u.company?.name ?? "—"}</td>
                  <td className="td">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/admin/usuarios?edit=${u.id}`} className="text-sm font-medium text-brand-700 hover:underline">Editar</Link>
                      {u.id !== s.uid && (
                        <form action={toggleUser}><input type="hidden" name="id" value={u.id} />
                          <button className="text-sm text-gray-600 hover:underline">{u.active ? "Desactivar" : "Activar"}</button></form>)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {editing ? (
          <form action={updateUser} className="card space-y-3 border-brand-600 p-5" key={editing.id}>
            <div className="flex items-center justify-between"><h2 className="font-semibold">Editar usuario</h2><Link href="/admin/usuarios" className="text-sm text-gray-500 hover:underline">Cancelar</Link></div>
            <input type="hidden" name="id" value={editing.id} />
            <div><label className="label">Nombre</label><input name="name" className="input" defaultValue={editing.name} required minLength={2} /></div>
            <div><label className="label">Correo</label><input name="email" type="email" className="input" defaultValue={editing.email} required /></div>
            <div><label className="label">Nueva contraseña</label><input name="password" type="password" minLength={8} className="input" placeholder="Dejar vacío para no cambiarla" autoComplete="new-password" /></div>
            <div><label className="label">Rol</label>
              <select name="role" className="input" defaultValue={editing.role} disabled={editing.id === s.uid}>
                <option value="CONSULTOR">Consultor</option><option value="CLIENTE">Cliente (solo lectura)</option><option value="SUPERADMIN">Administrador</option>
              </select>
              {editing.id === s.uid && <><input type="hidden" name="role" value="SUPERADMIN" /><p className="mt-1 text-xs text-gray-500">No puedes cambiar tu propio rol.</p></>}
            </div>
            <div><label className="label">Empresa (solo para Cliente)</label>
              <select name="companyId" className="input" defaultValue={editing.companyId ?? ""}>
                <option value="">—</option>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select></div>
            <p className="text-xs text-gray-500">{ROLE_HELP}</p>
            <button className="btn-primary w-full">Guardar cambios</button>
          </form>
        ) : (
          <form action={createUser} className="card space-y-3 p-5">
            <h2 className="font-semibold">Nuevo usuario</h2>
            <div><label className="label">Nombre</label><input name="name" className="input" required /></div>
            <div><label className="label">Correo</label><input name="email" type="email" className="input" required /></div>
            <div><label className="label">Contraseña inicial</label><input name="password" type="password" minLength={8} className="input" required autoComplete="new-password" /></div>
            <div><label className="label">Rol</label>
              <select name="role" className="input" defaultValue="CONSULTOR">
                <option value="CONSULTOR">Consultor</option><option value="CLIENTE">Cliente (solo lectura)</option><option value="SUPERADMIN">Administrador</option>
              </select></div>
            <div><label className="label">Empresa (solo para Cliente)</label>
              <select name="companyId" className="input" defaultValue="">
                <option value="">—</option>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select></div>
            <p className="text-xs text-gray-500">{ROLE_HELP}</p>
            <button className="btn-primary w-full">Crear usuario</button>
          </form>
        )}
      </div>
    </div>
  );
}
