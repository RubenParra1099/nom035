import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { createUser, toggleUser } from "../actions";

export default async function UsersPage() {
  const s = await requireUser(["SUPERADMIN"]);
  const users = await db.query.users.findMany({ with: { company: true }, orderBy: [asc(schema.users.name)] });
  const companies = await db.query.companies.findMany({ orderBy: [asc(schema.companies.name)] });
  const roleLabel = { SUPERADMIN: "Administrador", CONSULTOR: "Consultor", CLIENTE: "Cliente (solo lectura)" };
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Usuarios</h1>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card overflow-x-auto lg:col-span-2">
          <table className="w-full">
            <thead className="border-b border-gray-100"><tr><th className="th">Nombre</th><th className="th">Rol</th><th className="th">Empresa</th><th className="th"></th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className={u.active ? "" : "opacity-50"}>
                  <td className="td"><div className="font-medium">{u.name}</div><div className="text-xs text-gray-500">{u.email}</div></td>
                  <td className="td">{roleLabel[u.role]}</td>
                  <td className="td">{u.company?.name ?? "—"}</td>
                  <td className="td text-right">{u.id !== s.uid && (
                    <form action={toggleUser}><input type="hidden" name="id" value={u.id} />
                      <button className="text-sm text-brand-700 hover:underline">{u.active ? "Desactivar" : "Activar"}</button></form>)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form action={createUser} className="card space-y-3 p-5">
          <h2 className="font-semibold">Nuevo usuario</h2>
          <div><label className="label">Nombre</label><input name="name" className="input" required /></div>
          <div><label className="label">Correo</label><input name="email" type="email" className="input" required /></div>
          <div><label className="label">Contraseña inicial</label><input name="password" type="password" minLength={8} className="input" required /></div>
          <div><label className="label">Rol</label>
            <select name="role" className="input" defaultValue="CONSULTOR">
              <option value="CONSULTOR">Consultor</option><option value="CLIENTE">Cliente (solo lectura)</option><option value="SUPERADMIN">Administrador</option>
            </select></div>
          <div><label className="label">Empresa (solo para Cliente)</label>
            <select name="companyId" className="input" defaultValue="">
              <option value="">—</option>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></div>
          <button className="btn-primary w-full">Crear usuario</button>
        </form>
      </div>
    </div>
  );
}
