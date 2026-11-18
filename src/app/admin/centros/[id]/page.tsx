import Help from "@/components/ui/Help";
import Link from "next/link";
import { headers } from "next/headers";
import QRCode from "qrcode";
import CopyField from "@/components/CopyField";
import { notFound } from "next/navigation";
import { desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { canEdit, canSeeCompany, requireUser } from "@/lib/auth";
import ConfirmButton from "@/components/ConfirmButton";
import EvalHeader from "@/components/EvalHeader";
import { Drawer, Pill, SaveButton } from "@/components/ui/forms";
import { addComplaint, addDissemination, addExam, addTraining, deleteComplaint, deleteDissemination, deleteExam, deleteTraining, toggleDissemination, updateComplaint } from "../../gestion-actions";

const CAT = { VIOLENCIA: "Violencia laboral", ENTORNO: "Entorno organizacional", CARGA: "Carga / jornada", OTRO: "Otro" } as const;
const TOPIC = { POLITICA: "Política de prevención", VIOLENCIA: "Violencia laboral", LIDERAZGO: "Liderazgo", CARGA: "Carga y organización", OTRO: "Otro" } as const;
const STATUS = { RECIBIDA: "Recibida", EN_INVESTIGACION: "En investigación", CERRADA: "Cerrada" } as const;
const STATUS_TONE = { RECIBIDA: "amber", EN_INVESTIGACION: "blue", CERRADA: "green" } as const;
const EXAM_KIND = { MEDICO: "Examen médico", PSICOLOGICO: "Evaluación psicológica" } as const;
const EXAM_REASON = { GUIA_I: "Acontecimiento traumático (Guía I)", VIOLENCIA: "Violencia laboral", RIESGO_ALTO: "Riesgo alto o muy alto", SINTOMAS: "Signos o síntomas", OTRO: "Otro" } as const;
const EXAM_RESULT = { APTO: "Sin hallazgos", SEGUIMIENTO: "Requiere seguimiento", CANALIZADO: "Canalizado a atención" } as const;
const EXAM_TONE = { APTO: "green", SEGUIMIENTO: "amber", CANALIZADO: "blue" } as const;
const DIF_KIND = { POLITICA: "Política de prevención", RESULTADOS: "Resultados de la evaluación", MEDIDAS: "Medidas adoptadas", OTRO: "Otra información" } as const;
const DIF_TEMPLATE = "Compartimos con todo el personal la política de prevención de riesgos psicosociales de la empresa, los resultados generales de la evaluación y las medidas que se adoptarán.\n\nSi usted vive una situación de violencia laboral o un acontecimiento traumático severo, puede reportarlo de forma confidencial por el buzón de quejas o con Recursos Humanos.";
const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

export default async function WorkplacePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ev?: string; sec?: string }> }) {
  const { id } = await params;
  const { ev: evId, sec: secQ } = await searchParams;
  const sec = (["quejas", "capacitacion", "examenes", "difusion"] as const).find((k) => k === secQ) ?? "plantilla";
  const s = await requireUser();
  const wp = await db.query.workplaces.findFirst({ where: eq(schema.workplaces.id, id), with: { company: true, evaluations: true } });
  if (!wp || !canSeeCompany(s, wp.companyId)) notFound();
  const edit = canEdit(s);
  const ctx = wp.evaluations.find((e) => e.id === evId) ?? [...wp.evaluations].sort((a, b) => +b.createdAt - +a.createdAt)[0];
  const intro = "Plantilla, buzón de quejas, capacitación, exámenes médicos y difusión del centro de trabajo; alimentan los indicadores y el índice de cumplimiento.";
  const [complaints, trainings, areaRows, exams, difs] = await Promise.all([
    db.query.complaints.findMany({ where: eq(schema.complaints.workplaceId, id), orderBy: [desc(schema.complaints.receivedAt)] }),
    db.query.trainings.findMany({ where: eq(schema.trainings.workplaceId, id), orderBy: [desc(schema.trainings.heldAt)] }),
    db.query.workplaceAreas.findMany({ where: eq(schema.workplaceAreas.workplaceId, id) }),
    db.query.medicalExams.findMany({ where: eq(schema.medicalExams.workplaceId, id), orderBy: [desc(schema.medicalExams.examDate)] }),
    db.query.disseminations.findMany({ where: eq(schema.disseminations.workplaceId, id), orderBy: [desc(schema.disseminations.createdAt)] }),
  ]);
  const acks = difs.length ? await db.query.disseminationAcks.findMany({ where: inArray(schema.disseminationAcks.disseminationId, difs.map((d) => d.id)), orderBy: [desc(schema.disseminationAcks.createdAt)] }) : [];
  const h = await headers();
  const base = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const difRows = await Promise.all(difs.map(async (d) => {
    const url = `${base}/d/${d.token}`;
    const list = acks.filter((a) => a.disseminationId === d.id);
    return { ...d, url, qr: sec === "difusion" && d.active ? await QRCode.toDataURL(url, { margin: 1, width: 180 }) : null, list,
      byArea: areaRows.map((a) => ({ name: a.name, n: list.filter((x) => x.area === a.name).length, of: a.headcount })) };
  }));
  const bestCov = difRows.length && wp.headcount ? Math.max(...difRows.map((d) => d.list.length)) / wp.headcount : null;
  const today = new Date().toISOString().slice(0, 10);
  const areas = [...new Set([...wp.evaluations.flatMap((e) => e.departments), ...areaRows.map((a) => a.name)])].sort((a, b) => a.localeCompare(b, "es"));
  const areaTotal = areaRows.reduce((t, a) => t + a.headcount, 0);
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
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">Gestión preventiva · {wp.name}<Help id="mod.gestion" /></h1>
          <p className="max-w-3xl text-sm text-gray-500">{intro}</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5" role="tablist" aria-label="Sección">
        {([
          ["plantilla", "Plantilla por área", areaRows.length ? `${areaRows.length} áreas · ${areaTotal} de ${wp.headcount} trabajadores` : "Sin capturar"],
          ["quejas", "Buzón de quejas", complaints.length ? `${complaints.length} quejas · ${open.length} abiertas` : "Sin quejas"],
          ["capacitacion", "Capacitación", trainings.length ? `${trainings.length} sesiones · ${trainedPeople} participaciones` : "Sin sesiones"],
          ["examenes", "Exámenes médicos", exams.length ? `${exams.length} registros` : "Sin registros"],
          ["difusion", "Difusión", difs.length ? `${difs.length} ${difs.length === 1 ? "campaña" : "campañas"} · ${bestCov === null ? "—" : `${Math.round(bestCov * 100)}%`} cobertura` : "Sin campañas"],
        ] as const).map(([k, t, d]) => (
          <Link key={k} role="tab" aria-selected={sec === k} href={`?${new URLSearchParams({ ...(evId ? { ev: evId } : {}), sec: k }).toString()}`}
            className={`card p-4 transition ${sec === k ? "ring-2 ring-brand-600" : "hover:border-brand-600"}`}>
            <div className="text-sm font-semibold text-ink">{t}</div><div className="text-xs text-gray-500">{d}</div>
          </Link>
        ))}
      </div>

      {sec === "plantilla" && <section className="card space-y-4 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="flex items-center gap-2 text-lg font-semibold">Plantilla por área<Help id="ge.plantilla" /></h2>
            <p className="text-sm text-gray-500">Número de trabajadores de cada área, tomado de la Estructura de la empresa. Permite medir la participación y representatividad por área y la cobertura de capacitación.</p></div>
          <div className="text-sm"><div className="text-xs text-gray-500">Suma de áreas / plantilla del centro</div>
            <div className={`text-xl font-bold tabular-nums ${areaTotal && areaTotal !== wp.headcount ? "text-amber-600" : ""}`}>{areaTotal} / {wp.headcount}</div></div>
        </div>
        {areaRows.length ? (
          <ul className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">{[...areaRows].sort((x, y) => y.headcount - x.headcount).map((a) => <li key={a.id} className="flex justify-between rounded-lg border border-line px-3 py-2"><span>{a.name}</span><b className="tabular-nums">{a.headcount}</b></li>)}</ul>
        ) : <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30">Este centro aún no tiene áreas capturadas.</p>}
        {edit && <Link href={`/admin/empresas/${wp.companyId}?tab=estructura#centro-${wp.id}`} className="btn-secondary">✎ Editar en Estructura</Link>}
      </section>}

      {sec === "quejas" && <section className="card space-y-4 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="flex items-center gap-2 text-lg font-semibold">Buzón de quejas<Help id="ge.quejas" /></h2>
            <p className="text-sm text-gray-500">Mecanismo seguro y confidencial para recibir quejas por prácticas opuestas al entorno favorable y actos de violencia (numeral 8.1 b). No se registra la identidad de quien se queja.</p></div>
          <div className="flex gap-6 text-sm">
            <div><div className="text-xs text-gray-500">Abiertas</div><div className="text-xl font-bold tabular-nums">{open.length}</div></div>
            <div><div className="text-xs text-gray-500">Tiempo medio de cierre</div><div className="text-xl font-bold tabular-nums">{avg === null ? "—" : `${avg.toFixed(1)} días`}</div></div>
            <div><div className="text-xs text-gray-500">Resueltas en ≤ 30 días</div><div className="text-xl font-bold tabular-nums">{troq === null ? "—" : `${troq}%`}</div></div>
          </div>
        </div>
        {edit && (
          <Drawer trigger="+ Registrar queja" title="Registrar queja" subtitle="No se registra la identidad de quien se queja.">
            <form action={addComplaint} className="space-y-4">
              <input type="hidden" name="workplaceId" value={id} />
              <div><label className="label">Fecha de recepción</label><input type="date" name="receivedAt" className="input" required defaultValue={today} /></div>
              <div><label className="label">Categoría</label><select name="category" className="input">{Object.entries(CAT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div><label className="label">Área</label><AreaSelect name="area" /></div>
              <div><label className="label">Canal</label><select name="channel" className="input"><option>Buzón físico</option><option>Correo</option><option>Plataforma</option><option>Línea telefónica</option><option>Presencial</option></select></div>
              <div className="flex justify-end border-t border-line pt-4"><SaveButton done="Queja registrada ✓">Registrar queja</SaveButton></div>
            </form>
          </Drawer>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="border-b border-gray-100"><tr><th className="th">Recibida</th><th className="th">Categoría</th><th className="th">Área</th><th className="th">Días</th><th className="th">Estado</th><th className="th">Resolución</th><th className="th"></th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {complaints.map((c) => {
                const d = days(c.receivedAt, c.closedAt ?? today);
                return (
                  <tr key={c.id}>
                    <td className="td tabular-nums">{c.receivedAt}</td>
                    <td className="td">{CAT[c.category as keyof typeof CAT] ?? c.category}<div className="text-xs text-gray-400">{c.channel}</div></td>
                    <td className="td">{c.area ?? "—"}</td>
                    <td className={`td tabular-nums ${d > 30 && !c.closedAt ? "font-semibold text-red-600" : ""}`}>{d}</td>
                    <td className="td"><Pill tone={STATUS_TONE[c.status]}>{STATUS[c.status]}</Pill>{c.closedAt && <div className="mt-0.5 text-xs text-gray-500">Cerrada {c.closedAt}</div>}</td>
                    <td className="td max-w-[16rem] text-sm text-gray-700">{c.resolution || <span className="text-gray-400">—</span>}</td>
                    <td className="td">
                      {edit && (
                        <div className="flex items-center justify-end gap-3">
                          <Drawer trigger="Actualizar" triggerClass="text-sm font-medium text-brand-700 hover:underline" title="Actualizar queja" subtitle={`${CAT[c.category as keyof typeof CAT] ?? c.category} · recibida ${c.receivedAt}`}>
                            <form action={updateComplaint} className="space-y-4">
                              <input type="hidden" name="id" value={c.id} />
                              <div><label className="label">Estado</label><select name="status" defaultValue={c.status} className="input">{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                              <div><label className="label">Fecha de cierre</label><input type="date" name="closedAt" defaultValue={c.closedAt ?? ""} className="input" /></div>
                              <div><label className="label">Resolución</label><textarea name="resolution" defaultValue={c.resolution ?? ""} rows={4} className="input" placeholder="Qué se hizo y con qué resultado" /></div>
                              <div className="flex justify-end border-t border-line pt-4"><SaveButton>Guardar</SaveButton></div>
                            </form>
                          </Drawer>
                          <form action={deleteComplaint}><input type="hidden" name="id" value={c.id} /><ConfirmButton className="text-xs text-red-600 hover:underline" message="¿Eliminar este registro de queja?">Eliminar</ConfirmButton></form>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {complaints.length === 0 && <tr><td colSpan={7} className="td text-gray-500">Sin quejas registradas.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>}

      {sec === "capacitacion" && <section className="card space-y-4 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="flex items-center gap-2 text-lg font-semibold">Capacitación y sensibilización<Help id="ge.capacitacion" /></h2>
            <p className="text-sm text-gray-500">Registra cada sesión con su evaluación diagnóstica y final (0–100) para medir la ganancia de aprendizaje.</p></div>
          <div className="flex gap-6 text-sm">
            <div><div className="text-xs text-gray-500">Sesiones</div><div className="text-xl font-bold tabular-nums">{trainings.length}</div></div>
            <div><div className="text-xs text-gray-500">Participaciones</div><div className="text-xl font-bold tabular-nums">{trainedPeople}</div></div>
          </div>
        </div>
        {edit && (
          <Drawer trigger="+ Registrar capacitación" title="Registrar capacitación" subtitle="Con la evaluación diagnóstica y final se calcula la ganancia de aprendizaje.">
          <form action={addTraining} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="workplaceId" value={id} />
            <div className="sm:col-span-2"><label className="label">Nombre de la sesión</label><input name="title" className="input" required placeholder="Ej. Prevención de la violencia laboral" /></div>
            <div><label className="label">Tema</label><select name="topic" className="input">{Object.entries(TOPIC).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div><label className="label">Fecha</label><input type="date" name="heldAt" className="input" required defaultValue={today} /></div>
            <div><label className="label">Área</label><AreaSelect name="area" /></div>
            <div><label className="label">Asistentes</label><input type="number" min={0} name="attendees" className="input" required /></div>
            <div><label className="label">Promedio pre (0–100)</label><input type="number" min={0} max={100} step="0.1" name="preScore" className="input" /></div>
            <div><label className="label">Promedio post (0–100)</label><input type="number" min={0} max={100} step="0.1" name="postScore" className="input" /></div>
            <div className="flex justify-end border-t border-line pt-4 sm:col-span-2"><SaveButton done="Capacitación registrada ✓">Registrar capacitación</SaveButton></div>
          </form>
          </Drawer>
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
      </section>}

      {sec === "examenes" && <section className="card space-y-4 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="flex items-center gap-2 text-lg font-semibold">Exámenes médicos y evaluaciones psicológicas<Help id="ge.examenes" /></h2>
            <p className="max-w-3xl text-sm text-gray-500">Registro de los exámenes practicados a trabajadores expuestos a violencia laboral o a factores de riesgo cuando hay signos o síntomas (numeral 5.6). No guarde diagnósticos: solo la fecha, el motivo y si requiere seguimiento.</p></div>
          <div className="flex gap-6 text-sm">
            <div><div className="text-xs text-gray-500">Registros</div><div className="text-xl font-bold tabular-nums">{exams.length}</div></div>
            <div><div className="text-xs text-gray-500">Psicológicas</div><div className="text-xl font-bold tabular-nums">{exams.filter((x) => x.kind === "PSICOLOGICO").length}</div></div>
            <div><div className="text-xs text-gray-500">Con seguimiento</div><div className="text-xl font-bold tabular-nums">{exams.filter((x) => x.result !== "APTO").length}</div></div>
          </div>
        </div>
        {edit && (
          <Drawer trigger="+ Registrar examen" title="Registrar examen o evaluación" subtitle="Sin datos clínicos. Use un folio o número de empleado en lugar del nombre si lo prefiere.">
            <form action={addExam} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="workplaceId" value={id} />
              <div><label className="label">Fecha</label><input type="date" name="examDate" className="input" required defaultValue={today} /></div>
              <div><label className="label">Tipo</label><select name="kind" className="input">{Object.entries(EXAM_KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div className="sm:col-span-2"><label className="label">Motivo</label><select name="reason" className="input">{Object.entries(EXAM_REASON).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div><label className="label">Folio o número de empleado</label><input name="folio" className="input" placeholder="Opcional" maxLength={60} /></div>
              <div><label className="label">Área</label><AreaSelect name="area" /></div>
              <div><label className="label">Quién lo practicó</label><input name="provider" className="input" placeholder="Ej. Servicio médico, IMSS, psicólogo externo" /></div>
              <div><label className="label">Resultado</label><select name="result" className="input">{Object.entries(EXAM_RESULT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div className="flex justify-end border-t border-line pt-4 sm:col-span-2"><SaveButton done="Examen registrado ✓">Registrar</SaveButton></div>
            </form>
          </Drawer>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="border-b border-gray-100"><tr><th className="th">Fecha</th><th className="th">Tipo</th><th className="th">Motivo</th><th className="th">Folio</th><th className="th">Área</th><th className="th">Resultado</th><th className="th"></th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {exams.map((x) => (
                <tr key={x.id}>
                  <td className="td tabular-nums">{x.examDate}</td>
                  <td className="td">{EXAM_KIND[x.kind as keyof typeof EXAM_KIND] ?? x.kind}{x.provider && <div className="text-xs text-gray-400">{x.provider}</div>}</td>
                  <td className="td">{EXAM_REASON[x.reason as keyof typeof EXAM_REASON] ?? x.reason}</td>
                  <td className="td tabular-nums">{x.folio ?? "—"}</td>
                  <td className="td">{x.area ?? "—"}</td>
                  <td className="td"><Pill tone={EXAM_TONE[x.result as keyof typeof EXAM_TONE] ?? "gray"}>{EXAM_RESULT[x.result as keyof typeof EXAM_RESULT] ?? x.result}</Pill></td>
                  <td className="td">{edit && <form action={deleteExam}><input type="hidden" name="id" value={x.id} /><ConfirmButton className="text-xs text-red-600 hover:underline" message="¿Eliminar este registro?">Eliminar</ConfirmButton></form>}</td>
                </tr>
              ))}
              {exams.length === 0 && <tr><td colSpan={7} className="td text-gray-500">Sin exámenes registrados.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>}

      {sec === "difusion" && <section className="card space-y-4 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="flex items-center gap-2 text-lg font-semibold">Difusión con acuse de recibo<Help id="ge.difusion" /></h2>
            <p className="max-w-3xl text-sm text-gray-500">Comparta la política, los resultados y las medidas adoptadas (numeral 5.7). Cada trabajador abre el enlace o el QR y confirma que lo recibió; así queda la evidencia y la cobertura por área.</p></div>
          <div className="text-sm"><div className="text-xs text-gray-500">Mejor cobertura</div><div className="text-xl font-bold tabular-nums">{bestCov === null ? "—" : `${Math.round(bestCov * 100)}%`}</div></div>
        </div>
        {edit && (
          <Drawer trigger="+ Nueva difusión" title="Nueva difusión" subtitle="Se genera un enlace y un QR para que el personal confirme de recibido.">
            <form action={addDissemination} className="space-y-4">
              <input type="hidden" name="workplaceId" value={id} />
              <div><label className="label">Título</label><input name="title" className="input" required defaultValue={`Política de prevención y resultados NOM-035 · ${wp.name}`} /></div>
              <div><label className="label">Qué se difunde</label><select name="kind" className="input">{Object.entries(DIF_KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div><label className="label">Mensaje para el personal</label><textarea name="message" rows={9} className="input" required defaultValue={DIF_TEMPLATE} /><p className="mt-1 text-xs text-gray-500">Puede pegar aquí el texto de la política de prevención o un resumen de los resultados.</p></div>
              <div className="flex justify-end border-t border-line pt-4"><SaveButton done="Difusión creada ✓">Crear difusión</SaveButton></div>
            </form>
          </Drawer>
        )}
        {difRows.length === 0 && <p className="rounded-lg bg-surface-2 p-4 text-sm text-gray-600">Sin campañas de difusión. Cree una para obtener el enlace y el QR.</p>}
        <div className="space-y-4">
          {difRows.map((d) => {
            const cov = wp.headcount ? Math.min(100, Math.round((d.list.length / wp.headcount) * 100)) : null;
            return (
              <article key={d.id} className="rounded-xl border border-line p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-ink">{d.title}</h3><Pill tone={d.active ? "green" : "gray"}>{d.active ? "Recibiendo confirmaciones" : "Cerrada"}</Pill></div>
                    <p className="text-xs text-gray-500">{DIF_KIND[d.kind as keyof typeof DIF_KIND] ?? d.kind} · creada {d.createdAt.toISOString().slice(0, 10)}</p>
                  </div>
                  {edit && <div className="flex items-center gap-3">
                    <form action={toggleDissemination}><input type="hidden" name="id" value={d.id} /><button className="btn-secondary px-3 py-1.5 text-sm">{d.active ? "Cerrar" : "Reabrir"}</button></form>
                    <form action={deleteDissemination}><input type="hidden" name="id" value={d.id} /><ConfirmButton className="text-xs text-red-600 hover:underline" message="¿Eliminar esta difusión y sus confirmaciones?">Eliminar</ConfirmButton></form>
                  </div>}
                </div>
                <div className="mt-3 grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)]">
                  {d.qr && <div className="flex flex-col items-center gap-2"><img src={d.qr} alt="Código QR de la difusión" className="h-36 w-36 rounded-lg border" /><a href={d.url} target="_blank" className="text-xs text-brand-700 hover:underline">Abrir página ↗</a></div>}
                  <div className="min-w-0 space-y-3">
                    {d.active && <CopyField value={d.url} />}
                    <div>
                      <div className="flex items-baseline justify-between text-sm"><span className="text-gray-600">Confirmaciones</span><span className="font-semibold tabular-nums text-ink">{d.list.length}{wp.headcount ? ` de ${wp.headcount} · ${cov}%` : ""}</span></div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"><div className={`h-full rounded-full ${cov !== null && cov >= 80 ? "bg-green-600" : "bg-brand-600"}`} style={{ width: `${cov ?? 0}%` }} /></div>
                      <p className="mt-1 text-xs text-gray-500">Meta sugerida: 80% del personal o más.</p>
                    </div>
                    {d.byArea.length > 0 && <ul className="grid gap-x-10 gap-y-1.5 text-xs sm:grid-cols-2">{d.byArea.map((a) => (
                      <li key={a.name} className="flex items-center gap-2"><span className="w-28 truncate text-gray-600">{a.name}</span><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"><span className="block h-full rounded-full bg-brand-600" style={{ width: `${a.of ? Math.min(100, (a.n / a.of) * 100) : 0}%` }} /></span><span className="w-14 text-right tabular-nums text-gray-600">{a.n}/{a.of}</span></li>
                    ))}</ul>}
                    {d.list.length > 0 && <details className="text-sm"><summary className="cursor-pointer text-brand-700">Ver confirmaciones</summary>
                      <ul className="mt-2 max-h-56 divide-y divide-line overflow-y-auto rounded-lg border border-line">{d.list.map((a) => <li key={a.id} className="flex justify-between gap-3 px-3 py-1.5"><span>{a.name}{a.area && <span className="text-gray-500"> · {a.area}</span>}</span><span className="tabular-nums text-gray-500">{a.createdAt.toISOString().slice(0, 10)}</span></li>)}</ul>
                    </details>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>}
    </div>
  );
}
