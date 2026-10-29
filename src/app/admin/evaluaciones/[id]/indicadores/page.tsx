import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { canSeeCompany, requireUser } from "@/lib/auth";
import { FILTER_KEYS, MIN_GROUP, loadResults, type Filters } from "@/lib/results";
import { GUIDES, LEVEL_ACTION, LEVEL_LABEL, LEVELS, type Level } from "@/lib/nom035/guides";
import { LevelBadge, LEVEL_BG } from "@/components/Level";
import { AnswerLegend, AnswerStack, FreqBars, LevelStack } from "@/components/Charts";
import PrintButton from "@/components/PrintButton";

const DEMO_LABEL: Record<string, string> = {
  sexo: "Sexo", edad: "Edad", estadoCivil: "Estado civil", estudios: "Nivel de estudios", departamento: "Área",
  puesto: "Puesto", contratacion: "Contratación", jornada: "Jornada", rotacion: "Rotación de turnos",
  tiempoPuesto: "Tiempo en el puesto", experiencia: "Experiencia laboral",
};
const fmt = (n: number) => n.toLocaleString("es-MX", { maximumFractionDigits: 1, minimumFractionDigits: 1 });

export default async function IndicatorsPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const s = await requireUser();
  const filters: Filters = Object.fromEntries(FILTER_KEYS.map(({ key }) => [key, sp[key] || undefined]));
  const R = await loadResults(id, filters);
  if (!R || !canSeeCompany(s, R.evaluation.workplace.companyId)) notFound();
  const ev = R.evaluation;
  const g = GUIDES[ev.guide];
  const filtered = Object.values(filters).some(Boolean);
  const tooFew = R.n > 0 && R.n < MIN_GROUP;
  const catNames = Object.keys(g.categories);

  const priorityItems = [...R.itemStats].filter((i) => i.answered > 0).sort((a, b) => b.mean - a.mean).slice(0, 10);
  const actionLevels = [...new Set([R.agg.final.level, ...R.agg.categories.map((c) => c.level)])]
    .filter((l) => l !== "NULO") as Level[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href={`/admin/evaluaciones/${id}`} className="text-sm text-gray-500 hover:underline print:hidden">← {ev.name}</Link>
          <h1 className="text-2xl font-semibold">Resultados · {ev.workplace.company.name}</h1>
          <p className="text-sm text-gray-500">{ev.workplace.name} · {ev.name} · {g.name}</p>
        </div>
        <PrintButton />
      </div>

      {/* Filtros: una sola fila sobre los resultados */}
      <form className="card flex flex-wrap items-end gap-3 p-4 print:hidden">
        {FILTER_KEYS.map(({ key, label }) => (
          <div key={key} className="min-w-36 flex-1">
            <label className="label">{label}</label>
            <select name={key} defaultValue={filters[key] ?? ""} className="input">
              <option value="">Todos</option>
              {R.options[key].map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ))}
        <button className="btn-primary">Aplicar</button>
        {filtered && <Link href={`/admin/evaluaciones/${id}/indicadores`} className="btn-secondary">Quitar filtros</Link>}
      </form>
      {filtered && <p className="text-sm text-gray-600">Mostrando {R.n} de {R.total} respuestas ({Object.entries(filters).filter(([, v]) => v).map(([k, v]) => `${DEMO_LABEL[k]}: ${v}`).join(" · ")})</p>}

      {R.n === 0 ? (
        <div className="card p-8 text-center text-gray-500">Aún no hay respuestas para mostrar.</div>
      ) : tooFew ? (
        <div className="card p-8 text-center text-gray-600">Este grupo tiene menos de {MIN_GROUP} respuestas. Para proteger la confidencialidad no se muestran resultados.</div>
      ) : (
        <>
          {/* Resumen */}
          <div className="grid gap-4 lg:grid-cols-4">
            <div className={`card p-5 ${LEVEL_BG[R.agg.final.level]}`}>
              <div className="text-sm opacity-90">Calificación final del cuestionario</div>
              <div className="mt-1 text-4xl font-bold tabular-nums">{fmt(R.agg.final.mean)}</div>
              <div className="mt-1 text-lg font-semibold">Riesgo {LEVEL_LABEL[R.agg.final.level].toLowerCase()}</div>
              <div className="mt-2 text-xs opacity-90">Promedio de {R.n} trabajadores</div>
            </div>
            <div className="card p-5 lg:col-span-2">
              <div className="mb-3 text-sm font-medium text-gray-700">Trabajadores por nivel de riesgo (calificación final)</div>
              <LevelStack dist={R.agg.final.distribution} total={R.n} showLegend />
              <p className="mt-3 text-sm text-gray-600">
                <b>{R.agg.final.distribution.ALTO + R.agg.final.distribution.MUY_ALTO}</b> trabajadores ({Math.round(((R.agg.final.distribution.ALTO + R.agg.final.distribution.MUY_ALTO) / R.n) * 100)}%) en nivel alto o muy alto.
              </p>
            </div>
            {ev.includeGuideI ? (
              <div className="card p-5">
                <div className="text-sm font-medium text-gray-700">Guía I · Acontecimientos traumáticos severos</div>
                <div className="mt-2 text-sm">Vivieron un acontecimiento: <b>{R.guideI.event}</b></div>
                <div className="mt-1 text-3xl font-bold text-red-600 tabular-nums">{R.guideI.requires}</div>
                <div className="text-sm text-gray-600">requieren valoración clínica</div>
                {s.role !== "CLIENTE" && <Link href={`/admin/evaluaciones/${id}/confidencial`} className="mt-2 inline-block text-sm text-brand-700 hover:underline print:hidden">Seguimiento confidencial →</Link>}
              </div>
            ) : <div />}
          </div>

          {/* Categorías y dominios */}
          <section className="card overflow-x-auto p-5">
            <h2 className="mb-3 text-lg font-semibold">Semáforo por categoría y dominio</h2>
            <table className="w-full">
              <thead className="border-b border-gray-200"><tr>
                <th className="th">Categoría / dominio</th><th className="th text-right">Calificación</th><th className="th">Nivel</th><th className="th w-1/3">Trabajadores por nivel</th>
              </tr></thead>
              <tbody>
                {R.agg.categories.map((c) => (
                  <Fragment key={c.name}>
                    <tr className="border-t border-gray-200 bg-gray-50">
                      <td className="td font-semibold">{c.name}</td>
                      <td className="td text-right font-semibold tabular-nums">{fmt(c.mean)}</td>
                      <td className="td"><LevelBadge level={c.level} /></td>
                      <td className="td"><LevelStack dist={c.distribution} total={R.n} /></td>
                    </tr>
                    {R.agg.domains.filter((d) => d.category === c.name).map((d) => (
                      <tr key={d.name}>
                        <td className="td pl-8 text-gray-700">{d.name}</td>
                        <td className="td text-right tabular-nums">{fmt(d.mean)}</td>
                        <td className="td"><LevelBadge level={d.level} /></td>
                        <td className="td"><LevelStack dist={d.distribution} total={R.n} /></td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
            <div className="mt-3 flex flex-wrap gap-2">{LEVELS.map((l) => <LevelBadge key={l} level={l} />)}</div>
          </section>

          {/* Mapa de calor por área */}
          {!filters.departamento && R.byDepartment.length > 1 && (
            <section className="card overflow-x-auto p-5">
              <h2 className="text-lg font-semibold">Resultados por área</h2>
              <p className="mb-3 text-sm text-gray-500">Calificación promedio por categoría. Grupos con menos de {MIN_GROUP} personas se ocultan.</p>
              <table className="w-full">
                <thead className="border-b border-gray-200"><tr>
                  <th className="th">Área</th><th className="th text-right">n</th><th className="th">Final</th>
                  {catNames.map((c) => <th key={c} className="th">{c}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {R.byDepartment.map((d) => (
                    <tr key={d.name}>
                      <td className="td font-medium">{d.name}</td>
                      <td className="td text-right tabular-nums">{d.n}</td>
                      {d.hidden ? <td className="td text-gray-400" colSpan={catNames.length + 1}>Grupo pequeño — oculto</td> : (
                        <>
                          <Cell level={d.final.level} value={d.final.mean} />
                          {catNames.map((c) => <Cell key={c} level={d.categories[c].level} value={d.categories[c].mean} />)}
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* Reactivos críticos */}
          <section className="card overflow-x-auto p-5">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">Reactivos con mayor riesgo</h2>
                <p className="text-sm text-gray-500">Promedio de puntos por reactivo (0 = sin riesgo, 4 = máximo riesgo).</p>
              </div>
              <AnswerLegend />
            </div>
            <ItemTable rows={priorityItems} />
          </section>

          {/* Recomendaciones */}
          <section className="card p-5">
            <h2 className="text-lg font-semibold">Criterios para la toma de acciones</h2>
            <p className="mb-3 text-sm text-gray-500">Según los niveles obtenidos (Tabla de criterios de las Guías de referencia).</p>
            <div className="space-y-3">
              {actionLevels.map((l) => (
                <div key={l} className="flex gap-3">
                  <LevelBadge level={l} className="h-fit shrink-0" />
                  <div className="text-sm text-gray-700">
                    <div className="mb-1 text-xs text-gray-500">
                      Aplica a: {[R.agg.final.level === l ? "calificación final" : null, ...R.agg.categories.filter((c) => c.level === l).map((c) => c.name)].filter(Boolean).join(", ")}
                    </div>
                    {LEVEL_ACTION[l]}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Todos los reactivos */}
          <details className="card p-5">
            <summary className="cursor-pointer text-lg font-semibold">Detalle de los {g.items} reactivos</summary>
            <div className="mt-3 overflow-x-auto"><ItemTable rows={R.itemStats} /></div>
          </details>

          {/* Datos generales */}
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Object.entries(R.demographics).filter(([, v]) => Object.keys(v).length > 0 && !(Object.keys(v).length === 1 && v["Sin dato"])).map(([k, v]) => (
              <div key={k} className="card p-4"><h3 className="mb-2 text-sm font-semibold">{DEMO_LABEL[k] ?? k}</h3><FreqBars data={v} /></div>
            ))}
            {Object.entries(R.physical).map(([k, v]) => (
              <div key={k} className="card p-4"><h3 className="mb-2 text-sm font-semibold">Factor físico · {k}</h3><FreqBars data={v} /></div>
            ))}
          </section>

          {R.comments.length > 0 && (
            <details className="card p-5">
              <summary className="cursor-pointer text-lg font-semibold">Comentarios de los trabajadores ({R.comments.length})</summary>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-700">{R.comments.map((c, i) => <li key={i}>{c}</li>)}</ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}

function Cell({ level, value }: { level: Level; value: number }) {
  return (
    <td className="px-1 py-1">
      <div className={`rounded px-2 py-1 text-center text-xs font-semibold tabular-nums ${LEVEL_BG[level]}`} title={`${LEVEL_LABEL[level]} · ${fmt(value)}`}>
        {fmt(value)}<span className="ml-1 font-normal opacity-90">{LEVEL_LABEL[level].split(" ")[0]}</span>
      </div>
    </td>
  );
}

function ItemTable({ rows }: { rows: { n: number; text: string; counts: number[]; answered: number; mean: number; inverse: boolean }[] }) {
  return (
    <table className="w-full">
      <thead className="border-b border-gray-200"><tr>
        <th className="th">#</th><th className="th">Reactivo</th><th className="th">Respuestas</th><th className="th text-right">Puntos prom.</th>
      </tr></thead>
      <tbody className="divide-y divide-gray-100">
        {rows.map((r) => (
          <tr key={r.n}>
            <td className="td text-gray-500">{r.n}</td>
            <td className="td">{r.text}{r.inverse && <span className="ml-1 text-xs text-gray-400" title="Reactivo positivo: Siempre = 0 puntos">(+)</span>}</td>
            <td className="td w-56"><AnswerStack counts={r.counts} /><div className="text-[11px] text-gray-400">{r.answered} respuestas</div></td>
            <td className="td text-right font-semibold tabular-nums">{r.answered ? fmt(r.mean) : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
