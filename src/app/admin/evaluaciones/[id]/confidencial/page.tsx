import Link from "next/link";
import EvalHeader from "@/components/EvalHeader";
import { notFound } from "next/navigation";
import { and, desc, eq, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { toggleAttended } from "../../../actions";
import { updateAts } from "../../../gestion-actions";
import { Drawer, Pill, SaveButton } from "@/components/ui/forms";

const ATS_STATUS = {
  IDENTIFICADO: "Identificado", CANALIZADO: "Canalizado", EN_ATENCION: "En atención", ATENDIDO: "Atendido", NO_LOCALIZABLE: "No localizable (anónimo)",
} as const;
const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

const ATS_TONE = { IDENTIFICADO: "red", CANALIZADO: "amber", EN_ATENCION: "blue", ATENDIDO: "green", NO_LOCALIZABLE: "gray" } as const;

export default async function ConfidentialPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ estado?: string }> }) {
  const { id } = await params;
  const { estado = "todos" } = await searchParams;
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
  const keyOf = (x: (typeof rows)[number]) => x.f ? x.f.status : "SIN_CRITERIOS";
  const filters = [
    { id: "todos", label: "Todos", count: rows.length },
    ...Object.entries(ATS_STATUS).map(([k, v]) => ({ id: k, label: v.replace(" (anónimo)", ""), count: rows.filter((x) => keyOf(x) === k).length })).filter((o) => o.count > 0),
    ...(rows.some((x) => !x.f) ? [{ id: "SIN_CRITERIOS", label: "Vivió ATS sin criterios", count: rows.filter((x) => !x.f).length }] : []),
  ];
  // Primero lo urgente: casos sin canalizar, del más antiguo al más reciente
  const urgency = (x: (typeof rows)[number]) => !x.f ? -2 : x.f.canalizedAt ? -1 : days(x.f.identifiedAt, today);
  const shown = (estado === "todos" ? rows : rows.filter((x) => keyOf(x) === estado)).sort((a, b) => urgency(b) - urgency(a));

  return (
    <div className="space-y-6">
      <EvalHeader ev={{ id: ev.id, name: ev.name, guide: ev.guide, includeGuideI: ev.includeGuideI, workplaceId: ev.workplaceId, workplaceName: ev.workplace.name, companyId: ev.workplace.companyId, companyName: ev.workplace.company.name }}
        active="guia1" canSeeConfidential title="Seguimiento confidencial · Guía I"
        subtitle="Restringido a administradores y consultores. Canaliza a atención médica o psicológica a quien lo requiera (numerales 5.4 y 8.1); los nombres nunca aparecen en los indicadores." />

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="card p-4"><div className="text-xs text-gray-500">Requieren valoración clínica</div><div className="text-2xl font-bold tabular-nums text-red-600">{cases.length}</div></div>
        <div className="card p-4"><div className="text-xs text-gray-500">Sin canalizar</div><div className="text-2xl font-bold tabular-nums">{pending.length}</div>
          {pending.length > 0 && <div className="text-xs text-red-600">Más antiguo: {Math.max(...pending.map((x) => days(x.f!.identifiedAt, today)))} días</div>}</div>
        <div className="card p-4"><div className="text-xs text-gray-500">Canalizados en ≤ 15 días (OCA)</div><div className="text-2xl font-bold tabular-nums">{pct(canal15, cases.length)}</div></div>
        <div className="card p-4"><div className="text-xs text-gray-500">En atención o atendidos (TCA)</div><div className="text-2xl font-bold tabular-nums">{pct(care, cases.length)}</div></div>
      </div>

      <div className="card overflow-x-auto">
        <div className="flex flex-wrap gap-1.5 px-4 pt-4" role="tablist" aria-label="Filtrar por estado">
          {filters.map((o) => (
            <Link key={o.id} href={o.id === "todos" ? path : `${path}?estado=${o.id}`} role="tab" aria-selected={estado === o.id}
              className={`rounded-full border px-3 py-1 text-sm transition ${estado === o.id ? "border-brand-600 bg-brand-50 font-semibold text-brand-700" : "border-line text-gray-600 hover:border-gray-400"}`}>
              {o.label} <span className="tabular-nums text-gray-500">{o.count}</span>
            </Link>
          ))}
        </div>
        <table className="mt-3 w-full min-w-[860px]">
          <thead className="border-b border-gray-100"><tr><th className="th">Trabajador</th><th className="th">Área</th><th className="th">Guía I</th><th className="th">Estado</th><th className="th">Tiempo</th><th className="th">Institución y notas</th><th className="th"></th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {shown.map(({ r, c, f }) => {
              const d = f ? days(f.identifiedAt, f.canalizedAt ?? today) : null;
              const late = f && !f.canalizedAt && d! > 15;
              return (
                <tr key={r.id} className={late ? "bg-red-50/40" : ""}>
                  <td className="td"><Link href={`${path}/${r.id}`} className="font-medium text-brand-700 hover:underline">{c?.name ?? "Anónimo"}</Link><div className="text-xs text-gray-400">Ver ficha →</div></td>
                  <td className="td">{r.demographics.departamento ?? "—"}<div className="text-xs text-gray-500">{r.demographics.puesto}</div></td>
                  <td className="td">{r.atsRequires ? <span className="text-sm font-semibold text-red-600">Requiere valoración</span> : <span className="text-sm text-gray-600">Vivió ATS, sin criterios</span>}</td>
                  <td className="td">{f ? <Pill tone={ATS_TONE[f.status]}>{ATS_STATUS[f.status]}</Pill> : c ? <Pill tone={c.attended ? "green" : "amber"}>{c.attended ? "Atendido" : "Solicitó atención"}</Pill> : <span className="text-xs text-gray-500">Sin seguimiento requerido</span>}</td>
                  <td className={`td whitespace-nowrap text-sm tabular-nums ${late ? "font-semibold text-red-600" : "text-gray-700"}`}>
                    {f ? <>{d} días<div className="text-[11px] font-normal text-gray-500">{f.canalizedAt ? `canalizado ${f.canalizedAt}` : `sin canalizar · desde ${f.identifiedAt}`}</div></> : "—"}
                  </td>
                  <td className="td max-w-[14rem] text-sm text-gray-700">{f?.institution ?? ""}{(f?.notes || c?.notes) && <div className="truncate text-xs text-gray-500" title={f?.notes || c?.notes || ""}>{f?.notes || c?.notes}</div>}{!f?.institution && !f?.notes && !c?.notes && <span className="text-gray-400">—</span>}</td>
                  <td className="td text-right">
                    {f ? (
                      <Drawer trigger="Actualizar" triggerClass="text-sm font-medium text-brand-700 hover:underline" title="Seguimiento del caso" subtitle={`${c?.name ?? "Trabajador anónimo"} · ${r.demographics.departamento ?? ""}`}>
                        <form action={updateAts} className="space-y-4">
                          <input type="hidden" name="id" value={f.id} /><input type="hidden" name="path" value={path} />
                          <div><label className="label">Estado</label><select name="status" defaultValue={f.status} className="input">{Object.entries(ATS_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                          <div><label className="label">Fecha de canalización</label><input type="date" name="canalizedAt" defaultValue={f.canalizedAt ?? ""} className="input" /></div>
                          <div><label className="label">Institución</label><input name="institution" defaultValue={f.institution ?? ""} placeholder="IMSS, médico de la empresa, atención privada…" className="input" /></div>
                          <div><label className="label">Notas</label><textarea name="notes" defaultValue={f.notes ?? ""} rows={4} className="input" /></div>
                          <p className="text-xs text-gray-500">Identificado el {f.identifiedAt}. La meta es canalizar en 15 días o menos.</p>
                          <div className="flex justify-end border-t border-line pt-4"><SaveButton>Guardar seguimiento</SaveButton></div>
                        </form>
                      </Drawer>
                    ) : c ? (
                      <form action={toggleAttended} className="flex items-center justify-end gap-2">
                        <input type="hidden" name="id" value={c.id} /><input type="hidden" name="path" value={path} /><input type="hidden" name="notes" value={c.notes ?? ""} />
                        <button className="text-sm font-medium text-brand-700 hover:underline">{c.attended ? "Marcar pendiente" : "Marcar atendido"}</button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              );
            })}
            {shown.length === 0 && <tr><td className="td text-gray-500" colSpan={7}>{rows.length ? "Ningún caso con este estado." : "Nadie reportó acontecimientos traumáticos severos."}</td></tr>}
          </tbody>
        </table>
      </div>
      {others.length > 0 && (
        <div className="card overflow-x-auto">
          <h2 className="px-3 pt-3 font-semibold">Solicitudes de atención sin acontecimiento traumático</h2>
          <table className="w-full"><tbody className="divide-y divide-gray-100">
            {others.map(({ r, c }) => (
              <tr key={r.id}>
                <td className="td"><Link href={`${path}/${r.id}`} className="font-medium text-brand-700 hover:underline">{c.name}</Link></td>
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
