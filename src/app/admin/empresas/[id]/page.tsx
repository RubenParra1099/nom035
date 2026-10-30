import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { canEdit, canSeeCompany, requireUser } from "@/lib/auth";
import { requiredGuide, sampleSize } from "@/lib/nom035/score";
import ConfirmButton from "@/components/ConfirmButton";
import { createEvaluation, createWorkplace, deleteCompany, deleteWorkplace, updateCompany, updateWorkplace } from "../../actions";
import { SECTORS } from "@/lib/sectors";

const GUIDE_LABEL = { GUIA_II: "Guía II · 46", GUIA_III: "Guía III · 72" };
const STATUS_LABEL = { BORRADOR: "Borrador", ABIERTA: "Abierta", CERRADA: "Cerrada" };

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireUser();
  if (!canSeeCompany(s, id)) notFound();
  const company = await db.query.companies.findFirst({
    where: eq(schema.companies.id, id),
    with: { workplaces: { with: { evaluations: true }, orderBy: (w, { asc }) => [asc(w.name)] } },
  });
  if (!company) notFound();
  const evalIds = company.workplaces.flatMap((w) => w.evaluations.map((e) => e.id));
  const counts = evalIds.length
    ? await db.select({ id: schema.responses.evaluationId, n: sql<number>`count(*)::int` }).from(schema.responses)
        .where(inArray(schema.responses.evaluationId, evalIds)).groupBy(schema.responses.evaluationId)
    : [];
  const countOf = (eid: string) => counts.find((c) => c.id === eid)?.n ?? 0;
  const edit = canEdit(s);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-sm text-gray-500 hover:underline">← Empresas</Link>
        <h1 className="text-2xl font-semibold">{company.name}</h1>
        <p className="text-sm text-gray-500">{[company.sector, company.rfc, company.contact].filter(Boolean).join(" · ")}</p>
        {edit && (
          <details className="mt-2">
            <summary className="cursor-pointer text-sm font-medium text-brand-700">Editar datos de la empresa</summary>
            <form action={updateCompany} className="card mt-2 grid gap-3 p-4 md:grid-cols-5 md:items-end">
              <input type="hidden" name="id" value={company.id} />
              <div className="md:col-span-2"><label className="label">Razón social / nombre</label><input name="name" className="input" defaultValue={company.name} required /></div>
              <div><label className="label">RFC</label><input name="rfc" className="input" defaultValue={company.rfc ?? ""} /></div>
              <div><label className="label">Giro o sector</label><select name="sector" className="input" defaultValue={company.sector ?? ""}><option value="">Sin especificar</option>{SECTORS.map((x) => <option key={x}>{x}</option>)}</select></div>
              <div><label className="label">Contacto</label><input name="contact" className="input" defaultValue={company.contact ?? ""} /></div>
              <div className="md:col-span-5 md:text-right"><button className="btn-primary">Guardar</button></div>
            </form>
          </details>
        )}
      </div>

      {company.workplaces.map((w) => {
        const g = requiredGuide(w.headcount);
        return (
          <section key={w.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">{w.name} <Link href={`/admin/centros/${w.id}`} className="ml-2 text-sm font-normal text-brand-700 hover:underline">Gestión preventiva (quejas, capacitación) →</Link></h2>
                <p className="text-sm text-gray-500">{w.address}</p>
                <p className="mt-1 text-sm">
                  <b>{w.headcount}</b> trabajadores ·{" "}
                  {g === null ? "≤15 trabajadores: solo Guía I y política (no aplica Guía II/III)"
                    : g === "GUIA_II" ? "Aplica Guía II a todos los trabajadores"
                    : <>Aplica Guía III · muestra mínima <b>{sampleSize(w.headcount)}</b></>}
                </p>
              </div>
            </div>
            {edit && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-medium text-brand-700">Editar centro de trabajo</summary>
                <form action={updateWorkplace} className="mt-2 grid gap-3 rounded-lg border border-gray-200 p-4 md:grid-cols-[2fr_3fr_1fr_auto] md:items-end">
                  <input type="hidden" name="id" value={w.id} />
                  <div><label className="label">Nombre</label><input name="name" className="input" defaultValue={w.name} required minLength={2} /></div>
                  <div><label className="label">Domicilio</label><input name="address" className="input" defaultValue={w.address ?? ""} /></div>
                  <div><label className="label">Trabajadores</label><input name="headcount" type="number" min={0} defaultValue={w.headcount} className="input" required /></div>
                  <button className="btn-primary">Guardar cambios</button>
                  <p className="text-xs text-gray-500 md:col-span-4">El número de trabajadores define la guía que aplica, la muestra mínima y el margen de error de los indicadores. Las evaluaciones y respuestas del centro no cambian.</p>
                </form>
              </details>
            )}

            <div className="mt-4 overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-100"><tr>
                  <th className="th">Evaluación</th><th className="th">Guía</th><th className="th">Estado</th><th className="th">Respuestas</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {w.evaluations.map((e) => (
                    <tr key={e.id}>
                      <td className="td"><Link className="font-medium text-brand-700 hover:underline" href={`/admin/evaluaciones/${e.id}`}>{e.name}</Link></td>
                      <td className="td">{GUIDE_LABEL[e.guide]}</td>
                      <td className="td">{STATUS_LABEL[e.status]}</td>
                      <td className="td">{countOf(e.id)}</td>
                    </tr>
                  ))}
                  {w.evaluations.length === 0 && <tr><td colSpan={4} className="td text-gray-500">Sin evaluaciones.</td></tr>}
                </tbody>
              </table>
            </div>

            {edit && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-brand-700">+ Nueva evaluación</summary>
                <form action={createEvaluation} className="mt-3 grid gap-3 md:grid-cols-2">
                  <input type="hidden" name="workplaceId" value={w.id} />
                  <div><label className="label">Nombre</label><input name="name" className="input" required defaultValue={`Evaluación ${new Date().getFullYear()}`} /></div>
                  <div><label className="label">Cuestionario</label>
                    <select name="guide" className="input" defaultValue={g ?? "GUIA_II"}>
                      <option value="GUIA_II">Guía II · 46 reactivos (16 a 50 trabajadores)</option>
                      <option value="GUIA_III">Guía III · 72 reactivos (más de 50 trabajadores)</option>
                    </select></div>
                  <div><label className="label">Departamentos / áreas (uno por línea)</label><textarea name="departments" rows={4} className="input" placeholder={"Administración\nOperación\nMantenimiento"} /></div>
                  <div><label className="label">Tipos de puesto (uno por línea)</label><textarea name="positions" rows={4} className="input" defaultValue={"Operativo\nProfesional o Técnico\nAuxiliar / Asistente\nSupervisor\nCoordinador\nGerente"} /></div>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="includeGuideI" defaultChecked /> Incluir Guía I (acontecimientos traumáticos severos)</label>
                  <div className="md:text-right"><button className="btn-primary">Crear evaluación</button></div>
                </form>
              </details>
            )}

            {s.role === "SUPERADMIN" && (() => {
              const nResp = w.evaluations.reduce((t, e) => t + countOf(e.id), 0);
              return (
                <form action={deleteWorkplace} className="mt-4 flex justify-end border-t border-gray-100 pt-3">
                  <input type="hidden" name="id" value={w.id} />
                  <ConfirmButton className="text-sm font-medium text-red-700 hover:underline"
                    message={`¿Eliminar el centro "${w.name}"? Se borrarán también ${w.evaluations.length ? `${w.evaluations.length} ${w.evaluations.length === 1 ? "evaluación" : "evaluaciones"} con ${nResp} respuestas, ` : ""}su plantilla por área, quejas, capacitaciones y seguimientos de Guía I. No se puede deshacer.`}>
                    Eliminar centro de trabajo
                  </ConfirmButton>
                </form>
              );
            })()}
          </section>
        );
      })}

      {edit && (
        <form action={createWorkplace} className="card grid gap-3 p-5 md:grid-cols-4 md:items-end">
          <input type="hidden" name="companyId" value={company.id} />
          <div className="md:col-span-4"><h2 className="font-semibold">Nuevo centro de trabajo</h2></div>
          <div><label className="label">Nombre</label><input name="name" className="input" required /></div>
          <div><label className="label">Domicilio</label><input name="address" className="input" /></div>
          <div><label className="label">Número de trabajadores</label><input name="headcount" type="number" min={0} className="input" required /></div>
          <button className="btn-primary">Agregar centro</button>
        </form>
      )}

      {s.role === "SUPERADMIN" && (
        <form action={deleteCompany} className="text-right">
          <input type="hidden" name="id" value={company.id} />
          <ConfirmButton className="btn-danger" message="¿Eliminar la empresa con todos sus centros, evaluaciones y respuestas? No se puede deshacer.">Eliminar empresa y todos sus datos</ConfirmButton>
        </form>
      )}
    </div>
  );
}
