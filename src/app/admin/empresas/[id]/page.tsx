import Help from "@/components/ui/Help";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { canEdit, canSeeCompany, requireUser } from "@/lib/auth";
import { sampleSize } from "@/lib/nom035/score";
import ConfirmButton from "@/components/ConfirmButton";
import CompanyActions, { CompanyForm, DeleteForm, type CompanyInfo } from "@/components/CompanyActions";
import EvalCard from "@/components/EvalCard";
import { CentroEditor, ImportStructure } from "@/components/structure/CentroEditor";
import { guideLabel } from "@/lib/nom035/guideLabel";
import { GUIDES, levelFor } from "@/lib/nom035/guides";
import { deleteWorkplace } from "../../actions";

export const dynamic = "force-dynamic";

type Tab = "resumen" | "estructura" | "evaluaciones" | "gestion" | "datos";
const TABS: { id: Tab; label: string }[] = [
  { id: "resumen", label: "Resumen" },
  { id: "estructura", label: "Estructura" },
  { id: "evaluaciones", label: "Evaluaciones" },
  { id: "gestion", label: "Gestión preventiva" },
  { id: "datos", label: "Datos de la empresa" },
];

export default async function CompanyPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ centro?: string; tab?: string; nuevo?: string; creado?: string }>;
}) {
  const { id } = await params;
  const q = await searchParams;
  const s = await requireUser();
  if (!canSeeCompany(s, id)) notFound();
  const company = await db.query.companies.findFirst({
    where: eq(schema.companies.id, id),
    with: { workplaces: { with: { evaluations: true, areas: true }, orderBy: (w, { asc }) => [asc(w.name)] } },
  });
  if (!company) notFound();
  const edit = canEdit(s);
  const wps = company.workplaces;
  const base = `/admin/empresas/${company.id}`;
  const hasEval = wps.some((w) => w.evaluations.length);
  const requested = q.nuevo === "centro" ? "estructura" : q.centro && !q.tab ? "evaluaciones" : q.tab;
  const tab: Tab = TABS.some((t) => t.id === requested) && (requested !== "datos" || edit) ? (requested as Tab) : hasEval ? "resumen" : "estructura";
  const focus = wps.find((w) => w.id === q.centro);

  const evalIds = wps.flatMap((x) => x.evaluations.map((e) => e.id));
  const counts = evalIds.length
    ? await db.select({ id: schema.responses.evaluationId, n: sql<number>`count(*)::int`, mean: sql<number>`avg(${schema.responses.finalScore})::float`,
        ats: sql<number>`count(*) filter (where ${schema.responses.atsRequires})::int` }).from(schema.responses)
        .where(inArray(schema.responses.evaluationId, evalIds)).groupBy(schema.responses.evaluationId)
    : [];
  const statOf = (eid: string) => counts.find((c) => c.id === eid);
  const respOf = (w: (typeof wps)[number]) => w.evaluations.reduce((t, e) => t + (statOf(e.id)?.n ?? 0), 0);
  const latest = (w: (typeof wps)[number]) => [...w.evaluations].sort((a, b) => +b.createdAt - +a.createdAt)[0];
  const card = (w: (typeof wps)[number], e: (typeof wps)[number]["evaluations"][number]) => {
    const st = statOf(e.id); const enough = (st?.n ?? 0) >= 5; const N = e.headcount ?? w.headcount;
    return <EvalCard key={e.id} canSeeConfidential={s.role !== "CLIENTE"} ev={{
      id: e.id, name: e.name, guide: e.guide, includeGuideI: e.includeGuideI, status: e.status, createdAt: e.createdAt, workplaceId: w.id,
      responses: st?.n ?? 0, target: e.guide === "GUIA_III" ? sampleSize(N) : N || null,
      mean: enough ? st!.mean : null, level: enough ? levelFor(st!.mean, GUIDES[e.guide].finalCuts) : null, atsCases: st?.ats ?? 0,
    }} />;
  };

  const totals = {
    trab: wps.reduce((t, w) => t + w.headcount, 0), areas: wps.reduce((t, w) => t + w.areas.length, 0),
    evals: evalIds.length, resp: counts.reduce((t, c) => t + c.n, 0),
  };
  const info: CompanyInfo = { id: company.id, name: company.name, rfc: company.rfc, contact: company.contact, sector: company.sector, centros: wps.length, evaluaciones: totals.evals, respuestas: totals.resp };
  const gestion = tab === "gestion" && wps.length ? await Promise.all(wps.map(async (w) => {
    const [[c], [t]] = await Promise.all([
      db.select({ n: sql<number>`count(*)::int`, open: sql<number>`count(*) filter (where ${schema.complaints.status} <> 'CERRADA')::int` }).from(schema.complaints).where(eq(schema.complaints.workplaceId, w.id)),
      db.select({ n: sql<number>`count(*)::int`, people: sql<number>`coalesce(sum(${schema.trainings.attendees}),0)::int` }).from(schema.trainings).where(eq(schema.trainings.workplaceId, w.id)),
    ]);
    return { w, c, t };
  })) : [];
  const steps: [string, string, boolean, Tab][] = [
    ["Captura la estructura", "Centros de trabajo con sus áreas y trabajadores.", wps.length > 0 && wps.every((w) => w.areas.length > 0), "estructura"],
    ["Crea la evaluación", "Desde la estructura: “+ Nueva evaluación” en cada centro.", hasEval, "estructura"],
    ["Analiza los resultados", "Tablero e indicadores, informe PDF y casos de Guía I.", totals.resp > 0, "evaluaciones"],
    ["Interviene y da seguimiento", "Programa de intervención, quejas y capacitación.", false, "gestion"],
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <nav aria-label="Ruta" className="text-sm text-gray-500"><Link href="/admin" className="hover:text-gray-900">Empresas</Link> › <span>{company.name}</span></nav>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-ink">{company.name}<Help id="empresa" /></h1>
          <p className="text-sm text-gray-500">{[company.sector ?? "Giro sin especificar", company.rfc, `${wps.length} ${wps.length === 1 ? "centro" : "centros"}`, `${totals.trab} trabajadores`, `${totals.areas} áreas`].filter(Boolean).join(" · ")}</p>
        </div>
        {edit && <div className="flex flex-wrap items-center gap-2">
          <CompanyActions c={info} canDelete={s.role === "SUPERADMIN"} />
          <CentroEditor companyId={company.id} trigger="+ Agregar centro de trabajo" />
        </div>}
      </div>

      {q.creado && (
        <div className="card border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:bg-green-950/30">✓ Cliente creado. Su estructura y sus evaluaciones están listas; comparta el enlace desde cada evaluación.</div>
      )}

      <div className="flex gap-1 overflow-x-auto border-b border-line" role="tablist">
        {TABS.filter((t) => t.id !== "datos" || edit).map((t) => (
          <Link key={t.id} href={`${base}?tab=${t.id}`} role="tab" aria-selected={tab === t.id}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition ${tab === t.id ? "border-brand-600 text-brand-700" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
            {t.label}{t.id === "estructura" && wps.some((w) => !w.areas.length) && <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-amber-500" title="Hay centros sin áreas" />}
          </Link>
        ))}
        <span className="ml-auto flex items-center px-1"><Help id={`emp.${tab}`} /></span>
      </div>

      {/* ---------- Resumen ---------- */}
      {tab === "resumen" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {([["Centros de trabajo", wps.length], ["Trabajadores", totals.trab], ["Áreas", totals.areas], ["Evaluaciones", totals.evals], ["Respuestas", totals.resp]] as const).map(([l, v]) => (
              <div key={l} className="card p-4"><div className="text-xs font-medium text-gray-500">{l}</div><div className="mt-1 text-2xl font-semibold tabular-nums text-ink">{v.toLocaleString("es-MX")}</div></div>
            ))}
          </div>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Evaluación más reciente de cada centro</h2>
            {wps.map((w) => {
              const e = latest(w);
              return (
                <div key={w.id} className="space-y-2">
                  <div className="flex flex-wrap items-baseline gap-2"><h3 className="text-base font-semibold text-ink">{w.name}</h3><span className="text-xs text-gray-500">{w.headcount} trabajadores · {w.areas.length} áreas · {guideLabel(w.headcount)}</span>
                    {w.evaluations.length > 1 && <Link href={`${base}?tab=evaluaciones&centro=${w.id}`} className="ml-auto text-xs font-medium text-brand-700 hover:underline">Ver {w.evaluations.length} evaluaciones →</Link>}</div>
                  {e ? card(w, e) : (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-600">
                      Este centro aún no tiene evaluaciones.
                      {edit && <Link href={`/admin/centros/${w.id}/nueva-evaluacion`} className="btn-primary">+ Nueva evaluación</Link>}
                    </div>
                  )}
                </div>
              );
            })}
            {!wps.length && <p className="text-sm text-gray-500">Aún no hay centros de trabajo. Empiece por la pestaña <Link className="font-medium text-brand-700 hover:underline" href={`${base}?tab=estructura`}>Estructura</Link>.</p>}
          </section>
          <section className="card p-4">
            <h2 className="text-sm font-semibold text-ink">Cómo trabajar con esta empresa</h2>
            <ol className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
              {steps.map(([t, d, done, to], i) => (
                <li key={t}><Link href={`${base}?tab=${to}`} className="flex h-full gap-2.5 rounded-lg bg-surface-2 p-3 hover:ring-1 hover:ring-brand-600">
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold text-white ${done ? "bg-green-600" : "bg-brand-600"}`}>{done ? "✓" : i + 1}</span>
                  <span><span className="block font-medium text-ink">{t}</span><span className="block text-xs text-gray-500">{d}</span></span>
                </Link></li>
              ))}
            </ol>
          </section>
        </div>
      )}

      {/* ---------- Estructura ---------- */}
      {tab === "estructura" && (
        <div className="space-y-4">
          <div className="card flex flex-col gap-3 border-green-200 bg-green-50/60 p-4 text-sm sm:flex-row sm:items-center dark:bg-green-950/20">
            <span className="min-w-0 flex-1"><span className="mr-1 text-green-700">✓</span><b className="text-ink">La estructura es el único lugar donde se capturan centros y áreas.</b> <span className="text-gray-600">Las evaluaciones, el cuestionario, los filtros del tablero y la capacitación la toman de aquí. Cada evaluación guarda una foto de la estructura del día en que se crea.</span></span>
            {edit && <ImportStructure companyId={company.id} />}
          </div>
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {wps.map((w) => {
              const sum = w.areas.reduce((t, a) => t + a.headcount, 0);
              const ok = w.areas.length > 0 && sum === w.headcount;
              const mx = Math.max(1, ...w.areas.map((a) => a.headcount));
              const areas = [...w.areas].sort((a, b) => b.headcount - a.headcount);
              return (
                <section key={w.id} id={`centro-${w.id}`} className="card flex flex-col p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><h2 className="text-base font-semibold text-ink">{w.name}</h2><p className="truncate text-xs text-gray-500">{w.address || "Sin domicilio"}</p></div>
                    <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">{guideLabel(w.headcount)}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div><div className="text-xs text-gray-500">Trabajadores</div><div className="text-xl font-semibold tabular-nums text-ink">{w.headcount}</div></div>
                    <div><div className="text-xs text-gray-500">Áreas</div><div className="text-xl font-semibold tabular-nums text-ink">{w.areas.length}</div></div>
                    <div><div className="text-xs text-gray-500">Suma de áreas</div><div className={`text-xl font-semibold tabular-nums ${ok ? "text-green-700" : "text-amber-600"}`}>{w.areas.length ? `${sum} ${ok ? "✓" : "⚠"}` : "—"}</div></div>
                  </div>
                  <div className="mt-3 flex-1 border-t border-line pt-2 text-sm">
                    {areas.map((a) => (
                      <div key={a.id} className="flex items-center gap-3 py-1">
                        <span className="w-36 truncate text-gray-700" title={a.name}>{a.name}</span>
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full rounded-full bg-brand-600/40" style={{ width: `${(a.headcount / mx) * 100}%` }} /></span>
                        <span className="w-9 text-right font-semibold tabular-nums text-ink">{a.headcount || "—"}</span>
                        <span className="w-10 text-right text-xs tabular-nums text-gray-500">{a.headcount && w.headcount ? `${Math.round((a.headcount / w.headcount) * 100)}%` : ""}</span>
                      </div>
                    ))}
                    {!w.areas.length && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30">Este centro no tiene áreas. Captúrelas para medir participación por área y filtrar el tablero.</p>}
                    {w.areas.length > 0 && !ok && <p className="mt-1 text-xs text-amber-700">{sum < w.headcount ? `Faltan ${w.headcount - sum} trabajadores por asignar a un área.` : `Las áreas suman ${sum - w.headcount} más que el total.`}</p>}
                  </div>
                  {edit && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                      <CentroEditor companyId={company.id} trigger={w.areas.length ? "✎ Editar centro y áreas" : "+ Capturar áreas"} triggerClass="text-sm font-medium text-brand-700 hover:underline"
                        centro={{ id: w.id, name: w.name, address: w.address, headcount: w.headcount, areas: [...w.areas].sort((a, b) => a.name.localeCompare(b.name, "es")).map((a) => ({ name: a.name, headcount: a.headcount })) }} />
                      <Link href={`/admin/centros/${w.id}/nueva-evaluacion`} className="btn-secondary">+ Nueva evaluación</Link>
                    </div>
                  )}
                </section>
              );
            })}
            {edit && (
              <CentroEditor companyId={company.id} triggerClass="card flex min-h-48 flex-col items-center justify-center gap-1 border-dashed p-5 text-center text-brand-700 hover:border-brand-600"
                trigger={<><span className="text-3xl leading-none">＋</span><span className="font-semibold">Agregar centro de trabajo</span><span className="text-xs text-gray-500">Nombre, domicilio, trabajadores y áreas en un solo paso</span></>} />
            )}
          </div>
        </div>
      )}

      {/* ---------- Evaluaciones ---------- */}
      {tab === "evaluaciones" && (
        <div className="space-y-6">
          {focus && <p className="text-sm text-gray-600">Mostrando <b>{focus.name}</b>. <Link href={`${base}?tab=evaluaciones`} className="font-medium text-brand-700 hover:underline">Ver todos los centros</Link></p>}
          {(focus ? [focus] : wps).map((w) => (
            <section key={w.id} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><h2 className="text-base font-semibold text-ink">{w.name}</h2><p className="text-xs text-gray-500">{w.headcount} trabajadores · {guideLabel(w.headcount)} · {respOf(w)} respuestas</p></div>
                {edit && <Link href={`/admin/centros/${w.id}/nueva-evaluacion`} className="btn-primary">+ Nueva evaluación</Link>}
              </div>
              {[...w.evaluations].sort((a, b) => +b.createdAt - +a.createdAt).map((e) => card(w, e))}
              {!w.evaluations.length && <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">Este centro aún no tiene evaluaciones.</div>}
            </section>
          ))}
          {!wps.length && <p className="text-sm text-gray-500">Primero capture la <Link className="font-medium text-brand-700 hover:underline" href={`${base}?tab=estructura`}>estructura</Link>.</p>}
        </div>
      )}

      {/* ---------- Gestión preventiva ---------- */}
      {tab === "gestion" && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Buzón de quejas y capacitación de cada centro: demuestran que las medidas de prevención funcionan y alimentan los indicadores de efectividad.</p>
          <div className="grid gap-3 md:grid-cols-2">
            {gestion.map(({ w, c, t }) => (
              <Link key={w.id} href={`/admin/centros/${w.id}?sec=quejas`} className="card p-4 transition hover:border-brand-600">
                <div className="flex items-center justify-between"><h2 className="font-semibold text-ink">{w.name}</h2><span className="text-sm text-brand-700">Abrir →</span></div>
                <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                  <div><div className="text-xs text-gray-500">Buzón de quejas</div><div className="font-semibold text-ink">{c.n ? `${c.n} quejas · ${c.open} abiertas` : "Sin quejas"}</div></div>
                  <div><div className="text-xs text-gray-500">Capacitación</div><div className="font-semibold text-ink">{t.n ? `${t.n} sesiones · ${t.people} asistentes` : "Sin sesiones"}</div></div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ---------- Datos ---------- */}
      {tab === "datos" && edit && (
        <div className="space-y-5">
          <section className="card max-w-2xl p-5"><CompanyForm c={info} /></section>
          {s.role === "SUPERADMIN" && (
            <section className="space-y-3 rounded-xl border border-red-200 p-5">
              <h2 className="text-sm font-semibold text-red-700">Zona de riesgo</h2>
              {wps.map((w) => (
                <form key={w.id} action={deleteWorkplace} className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3 text-sm last:border-0">
                  <input type="hidden" name="id" value={w.id} />
                  <span>{w.name} · {w.evaluations.length} evaluaciones · {respOf(w)} respuestas</span>
                  <ConfirmButton className="btn-danger" message={`¿Eliminar el centro "${w.name}" con sus evaluaciones, respuestas, programa, casos de Guía I, quejas y capacitaciones? No se puede deshacer.`}>Eliminar centro</ConfirmButton>
                </form>
              ))}
              <div className="max-w-2xl border-t border-red-200 pt-4"><h3 className="mb-3 text-sm font-semibold text-red-700">Eliminar la empresa completa</h3><DeleteForm c={info} /></div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
