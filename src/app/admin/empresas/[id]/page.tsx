import Help from "@/components/ui/Help";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { canEdit, canSeeCompany, requireUser } from "@/lib/auth";
import { requiredGuide, sampleSize } from "@/lib/nom035/score";
import ConfirmButton from "@/components/ConfirmButton";
import EvalCard from "@/components/EvalCard";
import { GUIDES, levelFor } from "@/lib/nom035/guides";
import { createWorkplace, deleteCompany, deleteWorkplace, updateCompany, updateWorkplace } from "../../actions";
import { SECTORS } from "@/lib/sectors";

export const dynamic = "force-dynamic";

type Tab = "evaluaciones" | "gestion" | "datos";
const TABS: { id: Tab; label: string }[] = [
  { id: "evaluaciones", label: "Evaluaciones" },
  { id: "gestion", label: "Gestión preventiva" },
  { id: "datos", label: "Datos del centro" },
];
const guideText = (n: number) => {
  const g = requiredGuide(n);
  return g === null ? "Hasta 15 trabajadores: aplica Guía I y política de prevención"
    : g === "GUIA_II" ? "Aplica Guía II a todo el personal"
    : `Aplica Guía III · muestra mínima ${sampleSize(n)}`;
};

export default async function CompanyPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ centro?: string; tab?: string; nuevo?: string }>;
}) {
  const { id } = await params;
  const q = await searchParams;
  const s = await requireUser();
  if (!canSeeCompany(s, id)) notFound();
  const company = await db.query.companies.findFirst({
    where: eq(schema.companies.id, id),
    with: { workplaces: { with: { evaluations: true }, orderBy: (w, { asc }) => [asc(w.name)] } },
  });
  if (!company) notFound();
  const edit = canEdit(s);
  const wps = company.workplaces;
  const adding = edit && (q.nuevo === "centro" || wps.length === 0);
  const w = adding ? undefined : wps.find((x) => x.id === q.centro) ?? wps[0];
  const tab: Tab = TABS.some((t) => t.id === q.tab) && (q.tab !== "datos" || edit) ? (q.tab as Tab) : "evaluaciones";
  const base = `/admin/empresas/${company.id}`;
  const href = (centro: string, t: Tab = "evaluaciones") => `${base}?centro=${centro}${t === "evaluaciones" ? "" : `&tab=${t}`}`;

  const evalIds = wps.flatMap((x) => x.evaluations.map((e) => e.id));
  const counts = evalIds.length
    ? await db.select({ id: schema.responses.evaluationId, n: sql<number>`count(*)::int`, mean: sql<number>`avg(${schema.responses.finalScore})::float`,
        ats: sql<number>`count(*) filter (where ${schema.responses.atsRequires})::int` }).from(schema.responses)
        .where(inArray(schema.responses.evaluationId, evalIds)).groupBy(schema.responses.evaluationId)
    : [];
  const statOf = (eid: string) => counts.find((c) => c.id === eid);
  const respOf = (wid: string) => wps.find((x) => x.id === wid)!.evaluations.reduce((t, e) => t + (statOf(e.id)?.n ?? 0), 0);

  // Resumen de gestión preventiva del centro seleccionado
  const gestion = w && tab === "gestion" ? await Promise.all([
    db.select({ n: sql<number>`count(*)::int`, total: sql<number>`coalesce(sum(${schema.workplaceAreas.headcount}),0)::int` }).from(schema.workplaceAreas).where(eq(schema.workplaceAreas.workplaceId, w.id)),
    db.select({ n: sql<number>`count(*)::int`, open: sql<number>`count(*) filter (where ${schema.complaints.status} <> 'CERRADA')::int` }).from(schema.complaints).where(eq(schema.complaints.workplaceId, w.id)),
    db.select({ n: sql<number>`count(*)::int`, people: sql<number>`coalesce(sum(${schema.trainings.attendees}),0)::int` }).from(schema.trainings).where(eq(schema.trainings.workplaceId, w.id)),
  ]) : null;

  return (
    <div className="space-y-5">
      {/* Encabezado de la empresa */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <nav aria-label="Ruta" className="text-sm text-gray-500"><Link href="/admin" className="hover:text-gray-900">Empresas</Link> › <span>{company.name}</span></nav>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-ink">{company.name}<Help id="empresa" /></h1>
          <p className="text-sm text-gray-500">{[company.sector ?? "Giro sin especificar", company.rfc, `${wps.length} ${wps.length === 1 ? "centro de trabajo" : "centros de trabajo"}`].filter(Boolean).join(" · ")}</p>
        </div>
        {edit && <Link href={`${base}?nuevo=centro`} className="btn-secondary">+ Agregar centro</Link>}
      </div>

      {edit && (
        <details className="card p-4">
          <summary className="cursor-pointer text-sm font-medium text-brand-700">Editar datos de la empresa</summary>
          <form action={updateCompany} className="mt-3 grid gap-3 md:grid-cols-5 md:items-end">
            <input type="hidden" name="id" value={company.id} />
            <div className="md:col-span-2"><label className="label">Razón social / nombre</label><input name="name" className="input" defaultValue={company.name} required /></div>
            <div><label className="label">RFC</label><input name="rfc" className="input" defaultValue={company.rfc ?? ""} /></div>
            <div><label className="label">Giro o sector</label><select name="sector" className="input" defaultValue={company.sector ?? ""}><option value="">Sin especificar</option>{SECTORS.map((x) => <option key={x}>{x}</option>)}</select></div>
            <div><label className="label">Contacto</label><input name="contact" className="input" defaultValue={company.contact ?? ""} /></div>
            <div className="md:col-span-5 md:text-right"><button className="btn-primary">Guardar</button></div>
          </form>
        </details>
      )}

      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* Lista de centros */}
        <aside className="card h-fit p-2 print:hidden" aria-label="Centros de trabajo">
          <div className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Centros de trabajo</div>
          <ul className="space-y-1">
            {wps.map((x) => {
              const sel = x.id === w?.id;
              return (
                <li key={x.id}>
                  <Link href={href(x.id)} aria-current={sel ? "page" : undefined}
                    className={`block rounded-lg px-3 py-2.5 transition ${sel ? "bg-brand-50" : "hover:bg-gray-50"}`}>
                    <span className={`block text-sm font-semibold ${sel ? "text-brand-700" : "text-ink"}`}>{x.name}</span>
                    <span className="block text-xs text-gray-500">{x.headcount} trabajadores · {x.evaluations.length} {x.evaluations.length === 1 ? "evaluación" : "evaluaciones"} · {respOf(x.id)} resp.</span>
                  </Link>
                </li>
              );
            })}
            {wps.length === 0 && <li className="px-3 py-2 text-sm text-gray-500">Aún no hay centros.</li>}
          </ul>
          {edit && <Link href={`${base}?nuevo=centro`} className={`mt-1 block rounded-lg px-3 py-2 text-sm font-medium ${adding ? "bg-brand-50 text-brand-700" : "text-brand-700 hover:bg-gray-50"}`}>+ Agregar centro de trabajo</Link>}
        </aside>

        {/* Panel del centro */}
        <section className="card min-w-0 p-0">
          {adding ? (
            <div className="p-6">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">Nuevo centro de trabajo<Help id="empresa.nuevocentro" /></h2>
              <p className="mt-1 text-sm text-gray-500">La NOM-035 se aplica por centro de trabajo. Con el número de trabajadores la plataforma define la guía que aplica y la muestra mínima.</p>
              <form action={createWorkplace} className="mt-4 grid max-w-2xl gap-4 md:grid-cols-2">
                <input type="hidden" name="companyId" value={company.id} />
                <div className="md:col-span-2"><label className="label">Nombre del centro</label><input name="name" className="input" required minLength={2} placeholder="Ej. Planta Monterrey, Sucursal Centro" /></div>
                <div><label className="label">Domicilio</label><input name="address" className="input" /></div>
                <div><label className="label">Número de trabajadores</label><input name="headcount" type="number" min={0} className="input" required /></div>
                <div className="flex gap-2 md:col-span-2">
                  <button className="btn-primary">Agregar centro</button>
                  {wps.length > 0 && <Link href={base} className="btn-secondary">Cancelar</Link>}
                </div>
              </form>
            </div>
          ) : w && (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 px-6 pt-5">
                <div>
                  <h2 className="flex items-center gap-2 text-xl font-semibold text-ink">{w.name}<Help id="empresa.centro" /></h2>
                  <p className="text-sm text-gray-500">{w.headcount} trabajadores · {guideText(w.headcount)}{w.address ? ` · ${w.address}` : ""}</p>
                </div>
                {edit && <Link href={`/admin/centros/${w.id}/nueva-evaluacion`} className="btn-primary">+ Nueva evaluación</Link>}
              </div>
              <div className="mt-4 flex gap-1 overflow-x-auto border-b border-line px-6" role="tablist">
                {TABS.filter((t) => t.id !== "datos" || edit).map((t) => (
                  <Link key={t.id} href={href(w.id, t.id)} role="tab" aria-selected={tab === t.id}
                    className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition ${tab === t.id ? "border-brand-600 text-brand-700" : "border-transparent text-gray-500 hover:text-gray-800"}`}>{t.label}</Link>
                ))}
              </div>

              <div className="p-6">
                {tab === "evaluaciones" && (
                  <div className="space-y-3">
                    {[...w.evaluations].sort((a, b) => +b.createdAt - +a.createdAt).map((e) => {
                      const st = statOf(e.id);
                      const enough = (st?.n ?? 0) >= 5;
                      return <EvalCard key={e.id} canSeeConfidential={s.role !== "CLIENTE"} ev={{
                        id: e.id, name: e.name, guide: e.guide, includeGuideI: e.includeGuideI, status: e.status, createdAt: e.createdAt, workplaceId: w.id,
                        responses: st?.n ?? 0, target: w.headcount > 50 ? sampleSize(w.headcount) : w.headcount || null,
                        mean: enough ? st!.mean : null, level: enough ? levelFor(st!.mean, GUIDES[e.guide].finalCuts) : null, atsCases: st?.ats ?? 0,
                      }} />;
                    })}
                    {w.evaluations.length === 0 && (
                      <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
                        <p className="text-base font-semibold text-ink">Este centro aún no tiene evaluaciones</p>
                        <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">Al crearla obtendrás el enlace y el código QR para que el personal responda, o podrás importar respuestas desde Excel.</p>
                        {edit && <Link href={`/admin/centros/${w.id}/nueva-evaluacion`} className="btn-primary mt-4">+ Crear la primera evaluación</Link>}
                      </div>
                    )}
                  </div>
                )}

                {tab === "gestion" && gestion && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">Registros que demuestran que las medidas de prevención funcionan y alimentan los indicadores de efectividad del tablero.</p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {[
                        ["Plantilla por área", gestion[0][0].n ? `${gestion[0][0].n} áreas · ${gestion[0][0].total} trabajadores` : "Sin capturar", "Participación y prioridad por área"],
                        ["Buzón de quejas", gestion[1][0].n ? `${gestion[1][0].n} quejas · ${gestion[1][0].open} abiertas` : "Sin quejas registradas", "Quejas por prácticas opuestas al entorno favorable"],
                        ["Capacitación", gestion[2][0].n ? `${gestion[2][0].n} cursos · ${gestion[2][0].people} asistentes` : "Sin capacitaciones", "Sensibilización y efectividad del aprendizaje"],
                      ].map(([t, v, d]) => (
                        <div key={t} className="rounded-xl border border-line p-4">
                          <div className="text-sm font-semibold text-ink">{t}</div>
                          <div className="mt-1 text-base font-semibold text-brand-700">{v}</div>
                          <div className="mt-1 text-xs text-gray-500">{d}</div>
                        </div>
                      ))}
                    </div>
                    <Link href={`/admin/centros/${w.id}`} className="btn-secondary">Abrir gestión preventiva →</Link>
                  </div>
                )}

                {tab === "datos" && edit && (
                  <div className="space-y-6">
                    <form action={updateWorkplace} className="grid max-w-2xl gap-4 md:grid-cols-2">
                      <input type="hidden" name="id" value={w.id} />
                      <div className="md:col-span-2"><label className="label">Nombre del centro</label><input name="name" className="input" defaultValue={w.name} required minLength={2} /></div>
                      <div><label className="label">Domicilio</label><input name="address" className="input" defaultValue={w.address ?? ""} /></div>
                      <div><label className="label">Número de trabajadores</label><input name="headcount" type="number" min={0} defaultValue={w.headcount} className="input" required /></div>
                      <p className="text-xs text-gray-500 md:col-span-2">El número de trabajadores define la guía que aplica, la muestra mínima y el margen de error. Las evaluaciones y respuestas no cambian.</p>
                      <div className="md:col-span-2"><button className="btn-primary">Guardar cambios</button></div>
                    </form>
                    {s.role === "SUPERADMIN" && (
                      <div className="max-w-2xl rounded-xl border border-red-200 p-4">
                        <div className="text-sm font-semibold text-red-700">Eliminar este centro de trabajo</div>
                        <p className="mt-1 text-sm text-gray-600">Se borran sus {w.evaluations.length} evaluaciones con {respOf(w.id)} respuestas, informes, programa, casos de Guía I, plantilla por área, quejas y capacitaciones. No se puede deshacer.</p>
                        <form action={deleteWorkplace} className="mt-3">
                          <input type="hidden" name="id" value={w.id} />
                          <ConfirmButton className="btn-danger" message={`¿Eliminar el centro "${w.name}" y todos sus datos? No se puede deshacer.`}>Eliminar centro de trabajo</ConfirmButton>
                        </form>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      <details className="card p-4">
        <summary className="cursor-pointer text-sm font-semibold text-ink">Cómo trabajar con esta empresa</summary>
        <ol className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Registra el centro de trabajo", "Con su número de trabajadores: define la guía que aplica y la muestra mínima."],
            ["Crea la evaluación", "Botón \"+ Nueva evaluación\" del centro: elige la guía, las áreas y los puestos."],
            ["Analiza los resultados", "Tablero e indicadores, informe PDF y seguimiento de los casos de Guía I."],
            ["Interviene y da seguimiento", "Programa de intervención, quejas y capacitación; vuelve a evaluar para medir el avance."],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-2.5 rounded-lg bg-surface-2 p-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">{i + 1}</span>
              <span><span className="block font-medium text-ink">{t}</span><span className="block text-xs text-gray-500">{d}</span></span>
            </li>
          ))}
        </ol>
      </details>

      {s.role === "SUPERADMIN" && (
        <form action={deleteCompany} className="text-right">
          <input type="hidden" name="id" value={company.id} />
          <ConfirmButton className="btn-danger" message="¿Eliminar la empresa con todos sus centros, evaluaciones y respuestas? No se puede deshacer.">Eliminar empresa y todos sus datos</ConfirmButton>
        </form>
      )}
    </div>
  );
}
