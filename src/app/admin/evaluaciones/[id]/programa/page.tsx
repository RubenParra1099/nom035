import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { canEdit, canSeeCompany, requireUser } from "@/lib/auth";
import { GUIDES, LEVEL_LABEL, type Level } from "@/lib/nom035/guides";
import { aggregate, scoreWorker } from "@/lib/nom035/score";
import { INTERVENTIONS } from "@/lib/nom035/interventions";
import ConfirmButton from "@/components/ConfirmButton";
import { addAction, deleteAction, setActionDone } from "../../../gestion-actions";

const HEX: Record<Level, string> = { NULO: "#2bb3c0", BAJO: "#34a853", MEDIO: "#f6c026", ALTO: "#f28c28", MUY_ALTO: "#e53935" };

export default async function ProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireUser();
  const ev = await db.query.evaluations.findFirst({ where: eq(schema.evaluations.id, id), with: { workplace: { with: { company: true } } } });
  if (!ev || !canSeeCompany(s, ev.workplace.companyId)) notFound();
  const edit = canEdit(s);
  const g = GUIDES[ev.guide];
  const rows = await db.query.responses.findMany({ where: eq(schema.responses.evaluationId, id) });
  const agg = rows.length ? aggregate(ev.guide, rows.map((r) => scoreWorker(ev.guide, r.items as Record<number, number | null>))) : null;
  const actions = await db.query.planActions.findMany({ where: eq(schema.planActions.evaluationId, id), orderBy: [asc(schema.planActions.dueDate)] });
  const today = new Date().toISOString().slice(0, 10);
  const due90 = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
  const priority = agg ? agg.domains.filter((d) => ["MEDIO", "ALTO", "MUY_ALTO"].includes(d.level)).sort((a, b) => b.mean / g.domainCuts[b.name][3] - a.mean / g.domainCuts[a.name][3]) : [];
  const dueActs = actions.filter((a) => a.dueDate <= today);
  const onTime = dueActs.filter((a) => a.doneAt && a.doneAt <= a.dueDate).length;
  const cpi = dueActs.length ? Math.round((onTime / dueActs.length) * 100) : null;
  const done = actions.filter((a) => a.doneAt).length;
  const has = (d: string, a: string) => actions.some((x) => x.domain === d && x.action === a);

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/admin/evaluaciones/${id}`} className="text-sm text-gray-500 hover:underline">← {ev.name}</Link>
        <h1 className="text-2xl font-semibold">Programa de intervención</h1>
        <p className="max-w-3xl text-sm text-gray-600">{ev.workplace.company.name} · {ev.workplace.name}. Numeral 8.4: áreas y trabajadores sujetos, acciones, fechas, responsable y control de avances. Alimenta los indicadores CPI y EDI.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[["Acciones", actions.length], ["Concluidas", done], ["Vencidas sin concluir", dueActs.filter((a) => !a.doneAt).length], ["Cumplimiento a tiempo (CPI)", cpi === null ? "—" : `${cpi}%`]].map(([l, v]) => (
          <div key={String(l)} className="card p-4"><div className="text-xs text-gray-500">{l}</div><div className="text-2xl font-bold tabular-nums">{v}</div></div>
        ))}
      </div>

      {edit && priority.length > 0 && (
        <section className="card space-y-3 p-5">
          <h2 className="text-lg font-semibold">Acciones sugeridas por dominio prioritario</h2>
          <p className="text-sm text-gray-500">Dominios en nivel medio o superior. Agrega una sugerencia con un clic (fecha compromiso a 90 días; puedes editarla después eliminando y volviendo a crear).</p>
          {priority.map((d) => (
            <div key={d.name} className="rounded-lg border border-gray-200 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <span className="rounded-full px-2 py-0.5 text-[11px]" style={{ background: HEX[d.level], color: d.level === "MEDIO" ? "#1f2937" : "#fff" }}>{LEVEL_LABEL[d.level]}</span>
                {d.name} <span className="font-normal text-gray-500">· {d.mean.toFixed(1)} pts</span>
              </div>
              <ul className="space-y-1.5">
                {INTERVENTIONS[d.name].actions.map((a) => (
                  <li key={a} className="flex items-start justify-between gap-3 text-sm">
                    <span className="text-gray-700">{a}</span>
                    {has(d.name, a) ? <span className="shrink-0 text-xs text-green-700">En el programa ✓</span> : (
                      <form action={addAction} className="shrink-0">
                        <input type="hidden" name="evaluationId" value={id} /><input type="hidden" name="domain" value={d.name} />
                        <input type="hidden" name="action" value={a} /><input type="hidden" name="dueDate" value={due90} />
                        <button className="text-xs font-medium text-brand-700 hover:underline">+ Agregar</button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {edit && (
        <form action={addAction} className="card grid gap-3 p-5 md:grid-cols-6 md:items-end">
          <input type="hidden" name="evaluationId" value={id} />
          <h2 className="font-semibold md:col-span-6">Nueva acción</h2>
          <div className="md:col-span-2"><label className="label">Dominio objetivo</label>
            <select name="domain" className="input">{Object.keys(g.domains).map((d) => <option key={d}>{d}</option>)}<option>Guía I · Acontecimientos traumáticos severos</option><option>Política de prevención</option></select></div>
          <div className="md:col-span-4"><label className="label">Acción</label><input name="action" className="input" required /></div>
          <div><label className="label">Área</label><select name="area" className="input" defaultValue=""><option value="">Todo el centro</option>{ev.departments.map((a) => <option key={a}>{a}</option>)}</select></div>
          <div className="md:col-span-2"><label className="label">Responsable</label><input name="owner" className="input" /></div>
          <div><label className="label">Fecha compromiso</label><input type="date" name="dueDate" className="input" required defaultValue={due90} /></div>
          <div className="md:col-span-2 md:text-right"><button className="btn-primary">Agregar acción</button></div>
        </form>
      )}

      <section className="card overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead className="border-b border-gray-100"><tr><th className="th">Dominio</th><th className="th">Acción</th><th className="th">Área / responsable</th><th className="th">Compromiso</th><th className="th">Conclusión</th><th className="th"></th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {actions.map((a) => {
              const late = !a.doneAt && a.dueDate < today;
              return (
                <tr key={a.id}>
                  <td className="td text-xs text-gray-600">{a.domain}</td>
                  <td className="td">{a.action}</td>
                  <td className="td text-sm">{a.area ?? "Todo el centro"}<div className="text-xs text-gray-400">{a.owner ?? "Sin responsable"}</div></td>
                  <td className={`td tabular-nums ${late ? "font-semibold text-red-600" : ""}`}>{a.dueDate}{late && <div className="text-[11px]">Vencida</div>}</td>
                  <td className="td">
                    {edit ? (
                      <form action={setActionDone} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={a.id} />
                        <input type="date" name="doneAt" defaultValue={a.doneAt ?? ""} className="rounded border border-gray-300 px-2 py-1 text-sm" />
                        <button className="text-sm font-medium text-brand-700 hover:underline">Guardar</button>
                      </form>
                    ) : a.doneAt ?? "Pendiente"}
                    {a.doneAt && <div className={`text-[11px] ${a.doneAt <= a.dueDate ? "text-green-700" : "text-amber-600"}`}>{a.doneAt <= a.dueDate ? "A tiempo" : "Con retraso"}</div>}
                  </td>
                  <td className="td">{edit && <form action={deleteAction}><input type="hidden" name="id" value={a.id} /><ConfirmButton className="text-xs text-red-600 hover:underline" message="¿Eliminar esta acción?">Eliminar</ConfirmButton></form>}</td>
                </tr>
              );
            })}
            {actions.length === 0 && <tr><td colSpan={6} className="td text-gray-500">Aún no hay acciones registradas.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
