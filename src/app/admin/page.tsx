import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { canEdit, requireUser } from "@/lib/auth";
import { createCompany } from "./actions";

export default async function CompaniesPage() {
  const s = await requireUser();
  const { companies, workplaces, evaluations, responses } = schema;
  const rows = await db
    .select({
      id: companies.id, name: companies.name, rfc: companies.rfc,
      workplaces: sql<number>`count(distinct ${workplaces.id})::int`,
      evaluations: sql<number>`count(distinct ${evaluations.id})::int`,
      responses: sql<number>`count(${responses.id})::int`,
    })
    .from(companies)
    .leftJoin(workplaces, eq(workplaces.companyId, companies.id))
    .leftJoin(evaluations, eq(evaluations.workplaceId, workplaces.id))
    .leftJoin(responses, eq(responses.evaluationId, evaluations.id))
    .where(s.role === "CLIENTE" ? eq(companies.id, s.companyId ?? "") : undefined)
    .groupBy(companies.id)
    .orderBy(desc(companies.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Empresas</h1>
          <p className="text-sm text-gray-500">Clientes, centros de trabajo y evaluaciones NOM-035.</p>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card overflow-x-auto lg:col-span-2">
          <table className="w-full">
            <thead className="border-b border-gray-100"><tr>
              <th className="th">Empresa</th><th className="th">Centros</th><th className="th">Evaluaciones</th><th className="th">Respuestas</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="td"><Link className="font-medium text-brand-700 hover:underline" href={`/admin/empresas/${r.id}`}>{r.name}</Link>
                    {r.rfc && <div className="text-xs text-gray-500">{r.rfc}</div>}</td>
                  <td className="td">{r.workplaces}</td><td className="td">{r.evaluations}</td><td className="td">{r.responses}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td className="td text-gray-500" colSpan={4}>Aún no hay empresas.</td></tr>}
            </tbody>
          </table>
        </div>
        {canEdit(s) && (
          <form action={createCompany} className="card space-y-3 p-5">
            <h2 className="font-semibold">Nueva empresa</h2>
            <div><label className="label">Razón social / nombre</label><input name="name" className="input" required /></div>
            <div><label className="label">RFC</label><input name="rfc" className="input" /></div>
            <div><label className="label">Contacto</label><input name="contact" className="input" placeholder="Nombre, correo o teléfono" /></div>
            <button className="btn-primary w-full">Crear empresa</button>
          </form>
        )}
      </div>
    </div>
  );
}
