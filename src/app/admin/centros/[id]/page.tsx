import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { canEdit, canSeeCompany, requireUser } from "@/lib/auth";
import ConfirmButton from "@/components/ConfirmButton";
import EvalHeader from "@/components/EvalHeader";
import { addComplaint, addTraining, deleteComplaint, deleteTraining, updateComplaint } from "../../gestion-actions";

const CAT = { VIOLENCIA: "Violencia laboral", ENTORNO: "Entorno organizacional", CARGA: "Carga / jornada", OTRO: "Otro" } as const;
const TOPIC = { POLITICA: "Política de prevención", VIOLENCIA: "Violencia laboral", LIDERAZGO: "Liderazgo", CARGA: "Carga y organización", OTRO: "Otro" } as const;
const STATUS = { RECIBIDA: "Recibida", EN_INVESTIGACION: "En investigación", CERRADA: "Cerrada" } as const;
const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

export default async function WorkplacePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ev?: string }> }) {
  const { id } = await params;
  const { ev: evId } = await searchParams;
  const s = await requireUser();
  const wp = await db.query.workplaces.findFirst({ where: eq(schema.workplaces.id, id), with: { company: true, evaluations: true } });
  if (!wp || !canSeeCompany(s, wp.companyId)) notFound();
  const edit = canEdit(s);
  const ctx = wp.evaluations.find((e) => e.id === evId) ?? [...wp.evaluations].sort((a, b) => +b.createdAt - +a.createdAt)[0];
  const intro = "Buzón de quejas y capacitación del centro de trabajo; alimentan los indicadores de efectividad.";
  const [complaints, trainings] = await Promise.all([
    db.query.complaints.findMany({ where: eq(schema.complaints.workplaceId, id), orderBy: [desc(schema.complaints.receivedAt)] }),
    db.query.trainings.findMany({ where: eq(schema.trainings.workplaceId, id), orderBy: [desc(schema.trainings.heldAt)] }),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const areas = [...new Set(wp.evaluations.flatMap((e) => e.departments))].sort();
  const open = complaints.filter((c) => c.status !== "CERRADA");
  const closed = complaints.filter((c) => c.closedAt);
  const avg = closed.length ? closed.reduce((a, c) => a + days(c.receivedAt, c.closedAt!), 0) / closed.length : null;
  const due = complaints.filter((c) => days(c.receivedAt, today) >= 30);
  const troq = due.length ? Math.round((due.filter((c) => c.closedAt && days(c.receivedAt, c.closedAt) <= 30).length / due.length) * 100) : null;
  const trainedPeople = trainings.reduce((a, t) => a + t.attendees, 0);
  const scored = trainings.filter((t) => t.preScore !== null && t.postScore !== null && t.preScore < 100);
  const AreaSelect = ({ name }: { name: string }) => areas.length ? (
    <select name={name} className="input" defaultValue=""><option value="">Todo el centro</option>{areas.map((a) => <option key={a}>{a}</option>)}</select>
  ) : <input name={name} className="input" placeholder="Opcional" />;

  return (
    <div className="space-y-6">
      {ctx ? (
        <EvalHeader ev={{ id: ctx.id, name: ctx.name, guide: ctx.guide, includeGuideI: ctx.includeGuideI, workplaceId: wp.id, workplaceName: wp.name, companyId: wp.companyId, companyName: wp.company.name }}
          active="gestion" canSeeConfidential={s.role !== "CLIENTE"} title={`Gestión preventiva · ${wp.name}`} subtitle={intro} />
      ) : (
        <div className="space-y-1">
          <nav aria-label="Ruta" className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
            <Link href="/admin" className="hover:text-gray-900">Empresas</Link><span aria-hidden>›</span>
            <Link href={`/admin/empresas/${wp.companyId}`} className="hover:text-gray-900">{wp.company.name}</Link><span aria-hidden>›</span><span>{wp.name}</span>
          </nav>
          <h1 className="text-2xl font-semibold tracking-tight">Gestión preventiva · {wp.name}</h1>
          <p className="max-w-3xl text-sm text-gray-500">{intro}</p>
        </div>
      )}

      <section className="card space-y-4 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="text-lg font-semibold">Buzón de quejas</h2>
            <p className="text-sm text-gray-500">Mecanismo seguro y confidencial para recibir quejas por prácticas opuestas al entorno favorable y actos de violencia (numeral 8.1 b). No se registra la identidad de quien se queja.</p></div>
          <div className="flex gap-6 text-sm">
            <div><div className="text-xs text-gray-500">Abiertas</div><div className="text-xl font-bold tabular-nums">{open.length}</div></div>
            <div><div className="text-xs text-gray-500">Tiempo medio de cierre</div><div className="text-xl font-bold tabular-nums">{avg === null ? "—" : `${avg.toFixed(1)} días`}</div></div>
            <div><div className="text-xs text-gray-500">Resueltas en ≤ 30 días</div><div className="text-xl font-bold tabular-nums">{troq === null ? "—" : `${troq}%`}</div></div>
          </div>
        </div>
        {edit && (
          <form action={addComplaint} className="grid gap-3 rounded-lg bg-gray-50 p-3 md:grid-cols-5 md:items-end">
            <input type="hidden" name="workplaceId" value={id} />
            <div><label className="label">Fecha de recepción</label><input type="date" name="receivedAt" className="input" required defaultValue={today} /></div>
            <div><label className="label">Categoría</label><select name="category" className="input">{Object.entries(CAT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div><label className="label">Área</label><AreaSelect name="area" /></div>
            <div><label className="label">Canal</label><select name="channel" className="input"><option>Buzón físico</option><option>Correo</option><option>Plataforma</option><option>Línea telefónica</option><option>Presencial</option></select></div>
            <button className="btn-primary">Registrar queja</button>
          </form>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="border-b border-gray-100"><tr><th className="th">Recibida</th><th className="th">Categoría</th><th className="th">Área</th><th className="th">Días</th><th className="th">Estado y resolución</th><th className="th"></th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {complaints.map((c) => {
                const d = days(c.receivedAt, c.closedAt ?? today);
                return (
                  <tr key={c.id}>
                    <td className="td tabular-nums">{c.receivedAt}</td>
                    <td className="td">{CAT[c.category as keyof typeof CAT] ?? c.category}<div className="text-xs text-gray-400">{c.channel}</div></td>
                    <td className="td">{c.area ?? "—"}</td>
                    <td className={`td tabular-nums ${d > 30 && !c.closedAt ? "font-semibold text-red-600" : ""}`}>{d}</td>
                    <td className="td">
                      {edit ? (
                        <form action={updateComplaint} className="flex flex-wrap items-center gap-2">
                          <input type="hidden" name="id" value={c.id} />
                          <select name="status" defaultValue={c.status} className="rounded border border-gray-300 px-2 py-1 text-sm">{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                          <input type="date" name="closedAt" defaultValue={c.closedAt ?? ""} className="rounded border border-gray-300 px-2 py-1 text-sm" title="Fecha de cierre" />
                          <input name="resolution" defaultValue={c.resolution ?? ""} placeholder="Resolución" className="min-w-40 flex-1 rounded border border-gray-300 px-2 py-1 text-sm" />
                          <button className="text-sm font-medium text-brand-700 hover:underline">Guardar</button>
                        </form>
                      ) : <>{STATUS[c.status]}{c.closedAt && ` · ${c.closedAt}`}</>}
                    </td>
                    <td className="td">{edit && <form action={deleteComplaint}><input type="hidden" name="id" value={c.id} /><ConfirmButton className="text-xs text-red-600 hover:underline" message="¿Eliminar este registro de queja?">Eliminar</ConfirmButton></form>}</td>
                  </tr>
                );
              })}
              {complaints.length === 0 && <tr><td colSpan={6} className="td text-gray-500">Sin quejas registradas.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="text-lg font-semibold">Capacitación y sensibilización</h2>
            <p className="text-sm text-gray-500">Registra cada sesión con su evaluación diagnóstica y final (0–100) para medir la ganancia de aprendizaje.</p></div>
          <div className="flex gap-6 text-sm">
            <div><div className="text-xs text-gray-500">Sesiones</div><div className="text-xl font-bold tabular-nums">{trainings.length}</div></div>
            <div><div className="text-xs text-gray-500">Participaciones</div><div className="text-xl font-bold tabular-nums">{trainedPeople}</div></div>
          </div>
        </div>
        {edit && (
          <form action={addTraining} className="grid gap-3 rounded-lg bg-gray-50 p-3 md:grid-cols-4 md:items-end">
            <input type="hidden" name="workplaceId" value={id} />
            <div className="md:col-span-2"><label className="label">Nombre de la sesión</label><input name="title" className="input" required placeholder="Ej. Prevención de la violencia laboral" /></div>
            <div><label className="label">Tema</label><select name="topic" className="input">{Object.entries(TOPIC).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div><label className="label">Fecha</label><input type="date" name="heldAt" className="input" required defaultValue={today} /></div>
            <div><label className="label">Área</label><AreaSelect name="area" /></div>
            <div><label className="label">Asistentes</label><input type="number" min={0} name="attendees" className="input" required /></div>
            <div><label className="label">Promedio pre (0–100)</label><input type="number" min={0} max={100} step="0.1" name="preScore" className="input" /></div>
            <div><label className="label">Promedio post (0–100)</label><input type="number" min={0} max={100} step="0.1" name="postScore" className="input" /></div>
            <div className="md:col-span-4 md:text-right"><button className="btn-primary">Registrar capacitación</button></div>
          </form>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="border-b border-gray-100"><tr><th className="th">Fecha</th><th className="th">Sesión</th><th className="th">Área</th><th className="th text-right">Asistentes</th><th className="th text-right">Pre → Post</th><th className="th text-right">Ganancia</th><th className="th"></th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {trainings.map((t) => {
                const gna = t.preScore !== null && t.postScore !== null && t.preScore < 100 ? (t.postScore - t.preScore) / (100 - t.preScore) : null;
                return (
                  <tr key={t.id}>
                    <td className="td tabular-nums">{t.heldAt}</td>
                    <td className="td">{t.title}<div className="text-xs text-gray-400">{TOPIC[t.topic as keyof typeof TOPIC] ?? t.topic}</div></td>
                    <td className="td">{t.area ?? "Todo el centro"}</td>
                    <td className="td text-right tabular-nums">{t.attendees}</td>
                    <td className="td text-right tabular-nums">{t.preScore ?? "—"} → {t.postScore ?? "—"}</td>
                    <td className={`td text-right font-semibold tabular-nums ${gna === null ? "" : gna >= 0.5 ? "text-green-700" : gna >= 0.3 ? "text-amber-600" : "text-red-600"}`}>{gna === null ? "—" : gna.toFixed(2)}</td>
                    <td className="td">{edit && <form action={deleteTraining}><input type="hidden" name="id" value={t.id} /><ConfirmButton className="text-xs text-red-600 hover:underline" message="¿Eliminar esta capacitación?">Eliminar</ConfirmButton></form>}</td>
                  </tr>
                );
              })}
              {trainings.length === 0 && <tr><td colSpan={7} className="td text-gray-500">Sin capacitaciones registradas.</td></tr>}
            </tbody>
          </table>
          {scored.length > 0 && <p className="mt-2 text-xs text-gray-500">Ganancia = (post − pre) ÷ (100 − pre). Verde ≥ 0.50 · Amarillo 0.30–0.49 · Rojo &lt; 0.30.</p>}
        </div>
      </section>
    </div>
  );
}
