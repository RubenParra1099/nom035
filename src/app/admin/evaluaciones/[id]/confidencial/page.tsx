import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { toggleAttended } from "../../../actions";

export default async function ConfidentialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(["SUPERADMIN", "CONSULTOR"]);
  const ev = await db.query.evaluations.findFirst({ where: eq(schema.evaluations.id, id), with: { workplace: { with: { company: true } } } });
  if (!ev) notFound();
  const rows = await db.select({ r: schema.responses, c: schema.confidentialContacts })
    .from(schema.responses)
    .leftJoin(schema.confidentialContacts, eq(schema.confidentialContacts.responseId, schema.responses.id))
    .where(and(eq(schema.responses.evaluationId, id), or(eq(schema.responses.atsRequires, true), eq(schema.responses.atsEvent, true))))
    .orderBy(desc(schema.responses.atsRequires), desc(schema.responses.submittedAt));
  const others = await db.select({ r: schema.responses, c: schema.confidentialContacts })
    .from(schema.confidentialContacts)
    .innerJoin(schema.responses, eq(schema.confidentialContacts.responseId, schema.responses.id))
    .where(and(eq(schema.responses.evaluationId, id), eq(schema.responses.atsEvent, false)));
  const path = `/admin/evaluaciones/${id}/confidencial`;
  const Row = ({ r, c }: (typeof rows)[number]) => (
    <tr>
      <td className="td">{c?.name ?? <span className="text-gray-400">Anónimo</span>}</td>
      <td className="td">{r.demographics.departamento ?? "—"}<div className="text-xs text-gray-500">{r.demographics.puesto}</div></td>
      <td className="td">{r.atsRequires ? <span className="font-semibold text-red-600">Requiere valoración clínica</span> : r.atsEvent ? "Vivió ATS, sin criterios" : "—"}</td>
      <td className="td">{c ? (
        <form action={toggleAttended} className="flex items-center gap-2">
          <input type="hidden" name="id" value={c.id} /><input type="hidden" name="path" value={path} />
          <input name="notes" defaultValue={c.notes ?? ""} placeholder="Notas de seguimiento" className="input w-48" />
          <button className={c.attended ? "btn-secondary" : "btn-primary"}>{c.attended ? "Atendido ✓" : "Marcar atendido"}</button>
        </form>) : <span className="text-xs text-gray-500">Sin datos de contacto</span>}</td>
    </tr>
  );
  return (
    <div className="space-y-6">
      <div>
        <Link href={`/admin/evaluaciones/${id}`} className="text-sm text-gray-500 hover:underline">← {ev.name}</Link>
        <h1 className="text-2xl font-semibold">Seguimiento confidencial</h1>
        <p className="max-w-3xl text-sm text-gray-600">Información restringida a administradores y consultores. Los trabajadores que requieren valoración clínica
          deben canalizarse a atención médica o psicológica (numeral 5.4 / 8.1 de la NOM-035). Los nombres nunca aparecen en los indicadores.</p>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-100"><tr><th className="th">Trabajador</th><th className="th">Área</th><th className="th">Guía I</th><th className="th">Seguimiento</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((x) => <Row key={x.r.id} {...x} />)}
            {rows.length === 0 && <tr><td className="td text-gray-500" colSpan={4}>Nadie reportó acontecimientos traumáticos severos.</td></tr>}
          </tbody>
        </table>
      </div>
      {others.length > 0 && (
        <div className="card overflow-x-auto">
          <h2 className="px-3 pt-3 font-semibold">Solicitudes de atención sin acontecimiento traumático</h2>
          <table className="w-full"><tbody className="divide-y divide-gray-100">{others.map((x) => <Row key={x.r.id} {...x} />)}</tbody></table>
        </div>
      )}
    </div>
  );
}
