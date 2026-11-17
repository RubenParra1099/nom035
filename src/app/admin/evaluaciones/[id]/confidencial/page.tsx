import Help from "@/components/ui/Help";
import Link from "next/link";
import EvalHeader from "@/components/EvalHeader";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { canSeeCompany, requireUser } from "@/lib/auth";
import { toggleAttended } from "../../../actions";
import { updateAts } from "../../../gestion-actions";
import { Drawer, Pill, SaveButton } from "@/components/ui/forms";
import { folioOf } from "@/lib/results";
import { LEVEL_LABEL, type Level } from "@/lib/nom035/guides";

const ATS_STATUS = {
  IDENTIFICADO: "Identificado", CANALIZADO: "Canalizado", EN_ATENCION: "En atención", ATENDIDO: "Atendido", NO_LOCALIZABLE: "No localizable (anónimo)",
} as const;
const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

const ATS_TONE = { IDENTIFICADO: "red", CANALIZADO: "amber", EN_ATENCION: "blue", ATENDIDO: "green", NO_LOCALIZABLE: "gray" } as const;

export default async function ConfidentialPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ estado?: string; centro?: string }> }) {
  const { id } = await params;
  const { estado = "todos", centro = "" } = await searchParams;
  const s = await requireUser(["SUPERADMIN", "CONSULTOR"]);
  const ev = await db.query.evaluations.findFirst({ where: eq(schema.evaluations.id, id), with: { workplace: { with: { company: true } } } });
  if (!ev || !canSeeCompany(s, ev.workplace.companyId)) notFound();
  const allRows = await db.select({ r: schema.responses, c: schema.confidentialContacts, f: schema.atsFollowups, i: schema.respondentIdentities })
    .from(schema.responses)
    .leftJoin(schema.confidentialContacts, eq(schema.confidentialContacts.responseId, schema.responses.id))
    .leftJoin(schema.atsFollowups, eq(schema.atsFollowups.responseId, schema.responses.id))
    .leftJoin(schema.respondentIdentities, eq(schema.respondentIdentities.responseId, schema.responses.id))
    .where(and(eq(schema.responses.evaluationId, id), or(eq(schema.responses.atsRequires, true), eq(schema.responses.atsEvent, true))))
    .orderBy(desc(schema.responses.atsRequires), desc(schema.responses.submittedAt));
  const allOthers = await db.select({ r: schema.responses, c: schema.confidentialContacts, i: schema.respondentIdentities })
    .from(schema.confidentialContacts)
    .innerJoin(schema.responses, eq(schema.confidentialContacts.responseId, schema.responses.id))
    .leftJoin(schema.respondentIdentities, eq(schema.respondentIdentities.responseId, schema.responses.id))
    .where(and(eq(schema.responses.evaluationId, id), eq(schema.responses.atsEvent, false)));
  // Todas las respuestas (identificadas o anónimas) para abrir la ficha con el cuestionario completo
  const allParticipants = await db.select({
    rid: schema.responses.id, at: schema.responses.submittedAt, score: schema.responses.finalScore, level: schema.responses.finalLevel,
    g1: schema.responses.guideI, atsEvent: schema.responses.atsEvent, atsRequires: schema.responses.atsRequires, i: schema.respondentIdentities,
  })
    .from(schema.responses)
    .leftJoin(schema.respondentIdentities, eq(schema.respondentIdentities.responseId, schema.responses.id))
    .where(eq(schema.responses.evaluationId, id))
    .orderBy(asc(schema.respondentIdentities.workCenter), asc(schema.respondentIdentities.area), asc(schema.respondentIdentities.fullName), desc(schema.responses.submittedAt));
  // Filtro por centro de trabajo (evaluaciones generales): aplica a casos, indicadores, solicitudes y participantes
  const centros = [...new Set(allParticipants.flatMap((x) => x.i ? [x.i.workCenter] : []))].sort((a, b) => a.localeCompare(b, "es"));
  const inCentro = (i: { workCenter: string } | null) => !centro || i?.workCenter === centro;
  const rows = allRows.filter((x) => inCentro(x.i));
  const others = allOthers.filter((x) => inCentro(x.i));
  const participants = allParticipants.filter((x) => inCentro(x.i));
  const path = `/admin/evaluaciones/${id}/confidencial`;
  const qs = (o: { estado?: string; centro?: string }) => {
    const q = new URLSearchParams(Object.entries({ estado, centro, ...o }).filter(([k, v]) => v && !(k === "estado" && v === "todos")));
    const str = q.toString();
    return str ? `${path}?${str}` : path;
  };
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
        subtitle="Restringido a administradores y consultores. Canaliza a atención médica o psicológica a quien lo requiera (numeral 5.5); los nombres nunca aparecen en los indicadores." />

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
            <Link key={o.id} href={qs({ estado: o.id })} role="tab" aria-selected={estado === o.id}
              className={`rounded-full border px-3 py-1 text-sm transition ${estado === o.id ? "border-brand-600 bg-brand-50 font-semibold text-brand-700" : "border-line text-gray-600 hover:border-gray-400"}`}>
              {o.label} <span className="tabular-nums text-gray-500">{o.count}</span>
            </Link>
          ))}
          <span className="ml-1 flex items-center"><Help id="g1.estados" /></span>
          {centros.length > 1 && (
            <form className="ml-auto flex items-center gap-2" action={path}>
              {estado !== "todos" && <input type="hidden" name="estado" value={estado} />}
              <label htmlFor="centro" className="text-sm text-gray-500">Centro de trabajo</label>
              <select id="centro" name="centro" defaultValue={centro} className="input w-auto max-w-xs py-1 text-sm">
                <option value="">Todos los centros</option>
                {centros.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <button className="btn-secondary py-1 text-sm">Filtrar</button>
            </form>
          )}
        </div>
        <table className="mt-3 w-full min-w-[860px]">
          <thead className="border-b border-gray-100"><tr><th className="th">Trabajador</th><th className="th">Área</th><th className="th">Guía I</th><th className="th">Estado</th><th className="th">Tiempo</th><th className="th">Institución y notas</th><th className="th"></th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {shown.map(({ r, c, f, i }) => {
              const d = f ? days(f.identifiedAt, f.canalizedAt ?? today) : null;
              const late = f && !f.canalizedAt && d! > 15;
              return (
                <tr key={r.id} className={late ? "bg-red-50/40" : ""}>
                  <td className="td"><Link href={`${path}/${r.id}`} className="font-medium text-brand-700 hover:underline">{c?.name ?? i?.fullName ?? "Anónimo"}</Link><div className="text-xs text-gray-400">Ver ficha →</div></td>
                  <td className="td">{i?.area ?? r.demographics.departamento ?? "—"}<div className="text-xs text-gray-500">{[centros.length > 1 && !centro ? i?.workCenter : null, i?.position ?? r.demographics.puesto].filter(Boolean).join(" · ")}</div></td>
                  <td className="td">{r.atsRequires ? <span className="text-sm font-semibold text-red-600">Requiere valoración</span> : <span className="text-sm text-gray-600">Vivió ATS, sin criterios</span>}</td>
                  <td className="td">{f ? <Pill tone={ATS_TONE[f.status]}>{ATS_STATUS[f.status]}</Pill> : c ? <Pill tone={c.attended ? "green" : "amber"}>{c.attended ? "Atendido" : "Solicitó atención"}</Pill> : <span className="text-xs text-gray-500">Sin seguimiento requerido</span>}</td>
                  <td className={`td whitespace-nowrap text-sm tabular-nums ${late ? "font-semibold text-red-600" : "text-gray-700"}`}>
                    {f ? <>{d} días<div className="text-[11px] font-normal text-gray-500">{f.canalizedAt ? `canalizado ${f.canalizedAt}` : `sin canalizar · desde ${f.identifiedAt}`}</div></> : "—"}
                  </td>
                  <td className="td max-w-[14rem] text-sm text-gray-700">{f?.institution ?? ""}{(f?.notes || c?.notes) && <div className="truncate text-xs text-gray-500" title={f?.notes || c?.notes || ""}>{f?.notes || c?.notes}</div>}{!f?.institution && !f?.notes && !c?.notes && <span className="text-gray-400">—</span>}</td>
                  <td className="td text-right">
                    {f ? (
                      <Drawer trigger="Actualizar" triggerClass="text-sm font-medium text-brand-700 hover:underline" title="Seguimiento del caso" subtitle={`${c?.name ?? i?.fullName ?? "Trabajador anónimo"} · ${i?.area ?? r.demographics.departamento ?? ""}`}>
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
            {shown.length === 0 && <tr><td className="td text-gray-500" colSpan={7}>{rows.length ? "Ningún caso con este estado." : centro ? "Sin casos en este centro de trabajo." : "Nadie reportó acontecimientos traumáticos severos."}</td></tr>}
          </tbody>
        </table>
      </div>
      {others.length > 0 && (
        <div className="card overflow-x-auto">
          <h2 className="flex items-center gap-2 px-3 pt-3 font-semibold">Solicitudes de atención sin acontecimiento traumático<Help id="g1.solicitudes" /></h2>
          <table className="w-full"><tbody className="divide-y divide-gray-100">
            {others.map(({ r, c, i }) => (
              <tr key={r.id}>
                <td className="td"><Link href={`${path}/${r.id}`} className="font-medium text-brand-700 hover:underline">{c.name}</Link></td>
                <td className="td">{i?.area ?? r.demographics.departamento ?? "—"}{i && centros.length > 1 && !centro && <div className="text-xs text-gray-500">{i.workCenter}</div>}</td>
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
      {participants.length > 0 && (
        <details open className="card overflow-x-auto">
          <summary className="cursor-pointer px-4 py-3 font-semibold">Respuestas al cuestionario <span className="font-normal tabular-nums text-gray-500">{participants.length}</span>
            <span className="ml-2 text-xs font-normal text-gray-500">Abra una respuesta para ver el cuestionario completo (Guía I y reactivos)</span></summary>
          <table className="w-full min-w-[900px]">
            <thead className="border-y border-gray-100"><tr><th className="th">Trabajador</th><th className="th">Centro de trabajo</th><th className="th">Área de adscripción</th><th className="th">Puesto</th><th className="th">Respondió</th><th className="th">Calificación final</th><th className="th">Guía I</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {participants.map(({ rid, i, at, score, level, g1, atsEvent, atsRequires }) => (
                <tr key={rid}>
                  <td className="td"><Link href={`${path}/${rid}`} className="font-medium text-brand-700 hover:underline">{i?.fullName ?? `Anónimo · ${folioOf(rid)}`}</Link></td>
                  <td className="td text-sm">{i?.workCenter ?? "—"}</td>
                  <td className="td text-sm">{i?.area ?? "—"}</td>
                  <td className="td text-sm">{i?.position ?? "—"}</td>
                  <td className="td text-sm tabular-nums">{at.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}</td>
                  <td className="td text-sm tabular-nums">{score} · {LEVEL_LABEL[level as Level] ?? level}</td>
                  <td className={`td text-sm ${atsRequires ? "font-semibold text-red-600" : ""}`}>{atsRequires ? "Requiere valoración" : atsEvent ? "Vivió ATS" : g1 ? "Sin acontecimiento" : "No aplicada"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  );
}
