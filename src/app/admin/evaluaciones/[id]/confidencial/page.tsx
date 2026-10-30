import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { toggleAttended } from "../../../actions";
import { updateAts } from "../../../gestion-actions";

const ATS_STATUS = {
  IDENTIFICADO: "Identificado", CANALIZADO: "Canalizado", EN_ATENCION: "En atención", ATENDIDO: "Atendido", NO_LOCALIZABLE: "No localizable (anónimo)",
} as const;
const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

export default async function ConfidentialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(["SUPERADMIN", "CONSULTOR"]);
  const ev = await db.query.evaluations.findFirst({ where: eq(schema.evaluations.id, id), with: { workplace: { with: { company: true } } } });
  if (!ev) notFound();
  const rows = await db.select({ r: schema.responses, c: schema.confidentialContacts, f: schema.atsFollowups })
    .from(schema.responses)
    .leftJoin(schema.confidentialContacts, eq(schema.confidentialContacts.responseId, schema.responses.id))
    .leftJoin(schema.atsFollowups, eq(schema.atsFollowups.responseId, schema.responses.id))
    .where(and(eq(schema.responses.evaluationId, id), or(eq(schema.responses.atsRequires, true), eq(schema.responses.atsEvent, true))))
    .orderBy(desc(schema.responses.atsRequires), desc(schema.responses.submittedAt));
  const others = await db.select({ r: schema.responses, c: schema.confidentialContacts })
    .from(schema.confidentialContacts)
    .innerJoin(schema.responses, eq(schema.confidentialContacts.responseId, schema.responses.id))
    .where(and(eq(schema.responses.evaluationId, id), eq(schema.responses.atsEvent, false)));
  const path = `/admin/evaluaciones/${id}/confidencial`;
  const today = new Date().toISOString().slice(0, 10);
  const cases = rows.filter((x) => x.f);
  const canal15 = cases.filter((x) => x.f!.canalizedAt && days(x.f!.identifiedAt, x.f!.canalizedAt) <= 15).length;
  const care = cases.filter((x) => ["EN_ATENCION", "ATENDIDO"].includes(x.f!.status)).length;
  const pending = cases.filter((x) => x.f!.status === "IDENTIFICADO");
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/admin/evaluaciones/${id}`} className="text-sm text-gray-500 hover:underline">← {ev.name}</Link>
        <h1 className="text-2xl font-semibold">Seguimiento confidencial · Guía I</h1>
        <p className="max-w-3xl text-sm text-gray-600">Información restringida a administradores y consultores. Los trabajadores que requieren valoración clínica
          deben canalizarse a atención médica o psicológica (numerales 5.4 y 8.1). Los nombres nunca aparecen en los indicadores; los KPIs solo usan estados y fechas.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="card p-4"><div className="text-xs text-gray-500">Requieren valoración clínica</div><div className="text-2xl font-bold tabular-nums text-red-600">{cases.length}</div></div>
        <div className="card p-4"><div className="text-xs text-gray-500">Sin canalizar</div><div className="text-2xl font-bold tabular-nums">{pending.length}</div>
          {pending.length > 0 && <div className="text-xs text-red-600">Más antiguo: {Math.max(...pending.map((x) => days(x.f!.identifiedAt, today)))} días</div>}</div>
        <div className="card p-4"><div className="text-xs text-gray-500">Canalizados en ≤ 15 días (OCA)</div><div className="text-2xl font-bold tabular-nums">{pct(canal15, cases.length)}</div></div>
        <div className="card p-4"><div className="text-xs text-gray-500">En atención o atendidos (TCA)</div><div className="text-2xl font-bold tabular-nums">{pct(care, cases.length)}</div></div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[980px]">
          <thead className="border-b border-gray-100"><tr><th className="th">Trabajador</th><th className="th">Área</th><th className="th">Guía I</th><th className="th">Identificado</th><th className="th">Seguimiento</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(({ r, c, f }) => (
              <tr key={r.id}>
                <td className="td">{c?.name ?? <span className="text-gray-400">Anónimo</span>}</td>
                <td className="td">{r.demographics.departamento ?? "—"}<div className="text-xs text-gray-500">{r.demographics.puesto}</div></td>
                <td className="td">{r.atsRequires ? <span className="font-semibold text-red-600">Requiere valoración</span> : "Vivió ATS, sin criterios"}</td>
                <td className="td tabular-nums">{f ? <>{f.identifiedAt}<div className="text-xs text-gray-400">{days(f.identifiedAt, f.canalizedAt ?? today)} días{f.canalizedAt ? " hasta canalizar" : " sin canalizar"}</div></> : "—"}</td>
                <td className="td">
                  {f ? (
                    <form action={updateAts} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={f.id} /><input type="hidden" name="path" value={path} />
                      <select name="status" defaultValue={f.status} className="rounded border border-gray-300 px-2 py-1 text-sm">
                        {Object.entries(ATS_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                      <input type="date" name="canalizedAt" defaultValue={f.canalizedAt ?? ""} title="Fecha de canalización" className="rounded border border-gray-300 px-2 py-1 text-sm" />
                      <input name="institution" defaultValue={f.institution ?? ""} placeholder="Institución (IMSS, privado…)" className="w-44 rounded border border-gray-300 px-2 py-1 text-sm" />
                      <input name="notes" defaultValue={f.notes ?? ""} placeholder="Notas" className="w-40 rounded border border-gray-300 px-2 py-1 text-sm" />
                      <button className="text-sm font-medium text-brand-700 hover:underline">Guardar</button>
                    </form>
                  ) : c ? (
                    <form action={toggleAttended} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={c.id} /><input type="hidden" name="path" value={path} />
                      <input name="notes" defaultValue={c.notes ?? ""} placeholder="Notas" className="w-48 rounded border border-gray-300 px-2 py-1 text-sm" />
                      <button className="text-sm font-medium text-brand-700 hover:underline">{c.attended ? "Atendido ✓" : "Marcar atendido"}</button>
                    </form>
                  ) : <span className="text-xs text-gray-500">Sin seguimiento requerido</span>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td className="td text-gray-500" colSpan={5}>Nadie reportó acontecimientos traumáticos severos.</td></tr>}
          </tbody>
        </table>
      </div>
      {others.length > 0 && (
        <div className="card overflow-x-auto">
          <h2 className="px-3 pt-3 font-semibold">Solicitudes de atención sin acontecimiento traumático</h2>
          <table className="w-full"><tbody className="divide-y divide-gray-100">
            {others.map(({ r, c }) => (
              <tr key={r.id}>
                <td className="td">{c.name}</td>
                <td className="td">{r.demographics.departamento ?? "—"}</td>
                <td className="td">
                  <form action={toggleAttended} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={c.id} /><input type="hidden" name="path" value={path} />
                    <input name="notes" defaultValue={c.notes ?? ""} placeholder="Notas" className="w-56 rounded border border-gray-300 px-2 py-1 text-sm" />
                    <button className="text-sm font-medium text-brand-700 hover:underline">{c.attended ? "Atendido ✓" : "Marcar atendido"}</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody></table>
        </div>
      )}
    </div>
  );
}
