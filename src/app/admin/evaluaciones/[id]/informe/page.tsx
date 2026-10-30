import { Fragment } from "react";
import { notFound } from "next/navigation";
import { asc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { canEdit, canSeeCompany, requireUser } from "@/lib/auth";
import { MIN_GROUP, loadDashboard } from "@/lib/results";
import { GUIDES, LEVEL_ACTION, LEVEL_LABEL, LEVELS, type Level } from "@/lib/nom035/guides";
import { aggregate, sampleSize, scoreWorker, type ScoreResult } from "@/lib/nom035/score";
import { meanMoe } from "@/lib/nom035/stats";
import { computeKpis, DIM_NAMES } from "@/lib/nom035/kpis";
import { INTERVENTIONS, GUIA_I_ACTION } from "@/lib/nom035/interventions";
import EvalHeader from "@/components/EvalHeader";
import PrintButton from "@/components/PrintButton";
import { saveReport } from "../../../gestion-actions";

export const dynamic = "force-dynamic";

const LV: Record<Level, [string, string]> = {
  NULO: ["var(--lv-nulo)", "var(--lv-nulo-ink)"], BAJO: ["var(--lv-bajo)", "var(--lv-bajo-ink)"], MEDIO: ["var(--lv-medio)", "var(--lv-medio-ink)"],
  ALTO: ["var(--lv-alto)", "var(--lv-alto-ink)"], MUY_ALTO: ["var(--lv-muyalto)", "var(--lv-muyalto-ink)"],
};
const LIGHT: Record<string, [string, string, string]> = {
  VERDE: ["var(--lv-bajo)", "var(--lv-bajo-ink)", "En control"], AMARILLO: ["var(--lv-medio)", "var(--lv-medio-ink)", "Vigilancia"],
  ROJO: ["var(--lv-muyalto)", "var(--lv-muyalto-ink)", "Acción inmediata"], SIN_DATOS: ["var(--lv-none)", "var(--lv-none-ink)", "Sin datos"],
};
const f1 = (n: number) => n.toLocaleString("es-MX", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
const fdate = (d: Date | string) => new Date(typeof d === "string" ? d + "T12:00:00" : d).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

function Chip({ level }: { level: Level }) {
  return <span className="inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: LV[level][0], color: LV[level][1] }}>{LEVEL_LABEL[level]}</span>;
}
function Stack({ dist, total }: { dist: Record<Level, number>; total: number }) {
  return (
    <div className="flex h-3 w-full gap-px overflow-hidden rounded-sm">
      {LEVELS.filter((l) => dist[l]).map((l) => <div key={l} style={{ width: `${(dist[l] / total) * 100}%`, background: LV[l][0] }} />)}
    </div>
  );
}
function Bullet({ value, cuts, max }: { value: number; cuts: readonly number[]; max?: number }) {
  const top = Math.max(max ?? 0, cuts[3] * 1.2);
  const edges = [0, ...cuts, top];
  let lvl = 0; for (const c of cuts) if (value >= c) lvl++;
  return (
    <div className="relative h-3.5 w-full">
      <div className="absolute inset-y-0.5 left-0 right-0 flex gap-px overflow-hidden rounded-sm">
        {LEVELS.map((l, i) => <div key={l} style={{ width: `${((edges[i + 1] - edges[i]) / top) * 100}%`, background: LV[l][0], opacity: 0.25 }} />)}
      </div>
      <div className="absolute inset-y-[4px] left-0 rounded-r-sm" style={{ width: `${(Math.min(value, top) / top) * 100}%`, background: LV[LEVELS[lvl]][0] }} />
    </div>
  );
}
function H2({ n, children }: { n: string; children: React.ReactNode }) {
  return <h2 className="mb-2 mt-7 border-b border-gray-300 pb-1 text-[15px] font-bold text-gray-900"><span className="mr-2 text-brand-600">{n}</span>{children}</h2>;
}
const P = ({ children }: { children: React.ReactNode }) => <p className="mb-2 text-[11.5px] leading-relaxed text-gray-800">{children}</p>;
const TH = ({ children, right }: { children?: React.ReactNode; right?: boolean }) => <th className={`border-b border-gray-300 px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-600 ${right ? "text-right" : "text-left"}`}>{children}</th>;
const TD = ({ children, right, bold }: { children?: React.ReactNode; right?: boolean; bold?: boolean }) => <td className={`border-b border-gray-200 px-1.5 py-1 text-[11px] text-gray-800 ${right ? "text-right tabular-nums" : ""} ${bold ? "font-semibold" : ""}`}>{children}</td>;

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireUser();
  const data = await loadDashboard(id);
  if (!data || !canSeeCompany(s, data.evaluation.companyId)) notFound();
  const ev = data.evaluation;
  const evRow = await db.query.evaluations.findFirst({ where: eq(schema.evaluations.id, id), with: { workplace: { with: { company: true } } } });
  const report = await db.query.evaluationReports.findFirst({ where: eq(schema.evaluationReports.evaluationId, id) });
  const [span] = await db.select({ from: sql<string>`min(${schema.responses.submittedAt})`, to: sql<string>`max(${schema.responses.submittedAt})`,
    online: sql<number>`count(*) filter (where ${schema.responses.source} = 'EN_LINEA')::int`, imported: sql<number>`count(*) filter (where ${schema.responses.source} = 'IMPORTACION')::int` })
    .from(schema.responses).where(eq(schema.responses.evaluationId, id));
  const actions = await db.query.planActions.findMany({ where: eq(schema.planActions.evaluationId, id), orderBy: [asc(schema.planActions.dueDate)] });

  const g = GUIDES[ev.guide];
  const recs = data.records;
  const n = recs.length;
  const scores: ScoreResult[] = recs.map((r) => scoreWorker(ev.guide, Object.fromEntries(r.it.map((v, i) => [i + 1, v]))));
  const agg = n ? aggregate(ev.guide, scores) : null;
  const sample = ev.guide === "GUIA_III" ? sampleSize(ev.headcount) : ev.headcount;
  const moe = n && n < ev.headcount ? meanMoe(scores.map((x) => x.final), ev.headcount) : null;
  const maxDomain = Object.fromEntries(Object.entries(g.domains).map(([d, its]) => [d, its.length * 4]));
  const kpis = n >= MIN_GROUP ? computeKpis({ guide: ev.guide, records: recs, headcount: ev.headcount, minGroup: MIN_GROUP, intervention: data.intervention, areaHeadcount: data.areaHeadcount }) : [];
  const areaGroups: Record<string, ScoreResult[]> = {};
  recs.forEach((r, i) => { if (r.d.departamento !== "Sin dato") (areaGroups[r.d.departamento] ??= []).push(scores[i]); });
  const areas = Object.entries(areaGroups).map(([name, sc]) => ({ name, n: sc.length, hidden: sc.length < MIN_GROUP, a: aggregate(ev.guide, sc) }))
    .sort((a, b) => (a.hidden ? 1 : 0) - (b.hidden ? 1 : 0) || b.a.final.mean - a.a.final.mean);
  const items = Array.from({ length: g.items }, (_, i) => {
    const k = i + 1; let pts = 0, ans = 0, unf = 0;
    for (const r of recs) { const v = r.it[i]; if (v === null || v === undefined) continue; const p = g.inverse.has(k) ? v : 4 - v; pts += p; ans++; if (p >= 3) unf++; }
    return { k, text: g.text(k), mean: ans ? pts / ans : 0, unf: pct(unf, ans) };
  }).sort((a, b) => b.mean - a.mean).slice(0, 10);
  const g1 = { event: recs.filter((r) => r.g1 >= 1).length, req: recs.filter((r) => r.g1 === 2).length };
  const priority = agg ? agg.domains.filter((d) => ["MEDIO", "ALTO", "MUY_ALTO"].includes(d.level)).sort((a, b) => b.mean / g.domainCuts[b.name][3] - a.mean / g.domainCuts[a.name][3]) : [];
  const hi = agg ? agg.final.distribution.ALTO + agg.final.distribution.MUY_ALTO : 0;
  const company = evRow!.workplace.company, wp = evRow!.workplace;
  const reportDate = report?.reportDate ?? new Date().toISOString().slice(0, 10);
  const edit = canEdit(s);

  const autoConclusions = agg ? [
    `Se analizaron ${n} cuestionarios de la ${g.name} ${ev.headcount ? `(${pct(n, ev.headcount)}% de una plantilla de ${ev.headcount} trabajadores${ev.guide === "GUIA_III" ? `; muestra mínima requerida: ${sample}` : ""})` : ""}${n >= sample ? ", lo que cumple con la cobertura requerida." : "; la cobertura es menor a la requerida y los resultados deben tomarse con cautela."}`,
    `La calificación final promedio del centro de trabajo es de ${f1(agg.final.mean)} puntos${moe ? ` (± ${f1(moe)} al 95% de confianza)` : ""}, que corresponde a un nivel de riesgo ${LEVEL_LABEL[agg.final.level].toLowerCase()}. El ${pct(hi, n)}% de los trabajadores (${hi}) obtuvo una calificación individual en nivel alto o muy alto.`,
    priority.length ? `Los dominios que requieren intervención son: ${priority.map((d) => `${d.name} (${LEVEL_LABEL[d.level].toLowerCase()}, ${f1(d.mean)} pts)`).join("; ")}.` : "Ningún dominio alcanza el nivel medio o superior.",
    areas.filter((a) => !a.hidden).length > 1 ? `Por área, la calificación más alta corresponde a ${areas[0].name} (${f1(areas[0].a.final.mean)} pts, ${LEVEL_LABEL[areas[0].a.final.level].toLowerCase()}).` : "",
    ev.includeGuideI ? (g1.req ? `${g1.event} trabajadores reportaron haber vivido un acontecimiento traumático severo; ${g1.req} cumplen criterios para valoración clínica y deben ser canalizados.` : `${g1.event} trabajadores reportaron acontecimientos traumáticos severos; ninguno cumple criterios para valoración clínica.`) : "",
  ].filter(Boolean) : [];

  return (
    <div className="space-y-4">
      <div className="space-y-4 print:hidden">
        <EvalHeader ev={{ id: ev.id, name: ev.name, guide: ev.guide, includeGuideI: ev.includeGuideI, workplaceId: ev.workplaceId, workplaceName: ev.workplace, companyId: ev.companyId, companyName: ev.company }}
          active="informe" canSeeConfidential={s.role !== "CLIENTE"} title="Informe de resultados"
          subtitle="Documento con el contenido que pide la NOM-035 para el informe de la identificación y análisis. Usa “Imprimir / PDF” y elige “Guardar como PDF”." right={<PrintButton />} />
        {edit && (
          <details className="card p-4" open={!report}>
            <summary className="cursor-pointer font-semibold">Datos del informe {report ? <span className="ml-2 text-xs font-normal text-gray-500">guardados</span> : <span className="ml-2 text-xs font-normal text-amber-600">complétalos antes de descargar</span>}</summary>
            <form action={saveReport} className="mt-3 grid gap-3 md:grid-cols-2">
              <input type="hidden" name="evaluationId" value={id} />
              <div><label className="label">Actividad principal del centro de trabajo</label><input name="activity" className="input" defaultValue={report?.activity ?? ""} placeholder="Ej. Construcción de obra civil" /></div>
              <div><label className="label">Fecha del informe</label><input type="date" name="reportDate" className="input" defaultValue={reportDate} /></div>
              <div><label className="label">Responsable de la evaluación</label><input name="responsibleName" className="input" defaultValue={report?.responsibleName ?? ""} placeholder="Nombre completo" /></div>
              <div><label className="label">Cédula profesional (en su caso)</label><input name="responsibleLicense" className="input" defaultValue={report?.responsibleLicense ?? ""} /></div>
              <div className="md:col-span-2"><label className="label">Objetivo (opcional; si se deja vacío se usa el texto estándar)</label><textarea name="objective" rows={2} className="input" defaultValue={report?.objective ?? ""} /></div>
              <div className="md:col-span-2"><label className="label">Principales actividades realizadas (opcional; se agrega al texto automático)</label><textarea name="activities" rows={2} className="input" defaultValue={report?.activities ?? ""} placeholder="Ej. Sesiones informativas con mandos medios, aplicación en comedor con apoyo de RH…" /></div>
              <div className="md:col-span-2"><label className="label">Conclusiones adicionales del evaluador (opcional)</label><textarea name="conclusions" rows={3} className="input" defaultValue={report?.conclusions ?? ""} /></div>
              <div className="md:col-span-2 md:text-right"><button className="btn-primary">Guardar datos del informe</button></div>
            </form>
          </details>
        )}
      </div>

      <article className="report-paper mx-auto w-full max-w-[216mm] rounded-sm bg-white px-[14mm] py-[14mm] text-gray-900 shadow-lg print:max-w-none print:p-0 print:shadow-none">
        {/* Portada */}
        <section className="flex min-h-[240mm] flex-col print:min-h-[245mm]">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">035</span>
            <div className="text-xs uppercase tracking-widest text-gray-500">NOM-035-STPS-2018 · Factores de riesgo psicosocial</div>
          </div>
          <div className="mt-[45mm]">
            <div className="text-xs font-semibold uppercase tracking-widest text-brand-600">Informe de resultados</div>
            <h1 className="mt-2 text-[26px] font-bold leading-tight text-gray-900">Identificación y análisis de los factores de riesgo psicosocial y evaluación del entorno organizacional</h1>
            <div className="mt-8 space-y-1 text-[14px]">
              <div className="font-semibold">{company.name}</div>
              <div className="text-gray-700">{wp.name}{wp.address ? ` · ${wp.address}` : ""}</div>
              <div className="text-gray-700">{ev.name} · {g.name}{ev.includeGuideI ? " y Guía de Referencia I" : ""}</div>
            </div>
          </div>
          {agg && (
            <div className="mt-12 grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-gray-300 p-3"><div className="text-[10px] uppercase text-gray-500">Calificación final</div><div className="text-2xl font-bold">{f1(agg.final.mean)}</div><Chip level={agg.final.level} /></div>
              <div className="rounded-lg border border-gray-300 p-3"><div className="text-[10px] uppercase text-gray-500">Trabajadores en alto o muy alto</div><div className="text-2xl font-bold">{pct(hi, n)}%</div><div className="text-[11px] text-gray-600">{hi} de {n}</div></div>
              <div className="rounded-lg border border-gray-300 p-3"><div className="text-[10px] uppercase text-gray-500">Cuestionarios analizados</div><div className="text-2xl font-bold">{n}</div><div className="text-[11px] text-gray-600">plantilla de {ev.headcount}</div></div>
            </div>
          )}
          <div className="mt-auto border-t border-gray-300 pt-3 text-[11px] text-gray-600">
            Fecha de elaboración: {fdate(reportDate)}{report?.responsibleName ? ` · Responsable: ${report.responsibleName}` : ""}
            <div className="mt-1">Documento confidencial. Los resultados se presentan de forma agregada; no se identifica a ningún trabajador.</div>
          </div>
        </section>

        <div className="break-before-page" />
        <H2 n="1.">Datos del centro de trabajo</H2>
        <table className="mb-2 w-full border-collapse"><tbody>
          {[["Razón social", company.name], ["RFC", company.rfc ?? "—"], ["Centro de trabajo", wp.name], ["Domicilio", wp.address ?? "—"],
            ["Actividad principal", report?.activity ?? "—"], ["Número de trabajadores", String(ev.headcount)],
            ["Cuestionario aplicado", `${g.name}${ev.includeGuideI ? " y Guía de Referencia I (acontecimientos traumáticos severos)" : ""}`]].map(([k, v]) => (
            <tr key={k}><td className="w-48 border-b border-gray-200 py-1 pr-3 text-[11px] font-semibold text-gray-600">{k}</td><td className="border-b border-gray-200 py-1 text-[11px]">{v}</td></tr>
          ))}
        </tbody></table>

        <H2 n="2.">Objetivo</H2>
        <P>{report?.objective || `Identificar y analizar los factores de riesgo psicosocial y evaluar el entorno organizacional en ${wp.name}, conforme a la NOM-035-STPS-2018, para determinar el nivel de riesgo, los grupos y dominios que requieren atención, e identificar a los trabajadores que fueron sujetos a acontecimientos traumáticos severos, a fin de establecer las medidas de prevención y control correspondientes.`}</P>

        <H2 n="3.">Principales actividades realizadas</H2>
        <P>
          Se aplicó la {g.name}{ev.includeGuideI ? " junto con la Guía de Referencia I" : ""} {span?.from ? `entre el ${fdate(new Date(span.from))} y el ${fdate(new Date(span.to))}` : ""}.
          {" "}Se obtuvieron {n} cuestionarios válidos{span ? ` (${span.online} en línea y ${span.imported} capturados o importados)` : ""}.
          {" "}La aplicación fue voluntaria y confidencial; se informó a los trabajadores el propósito de la evaluación y que los resultados se presentan de forma agrupada.
          {ev.guide === "GUIA_III" && ` La muestra mínima para una plantilla de ${ev.headcount} trabajadores es de ${sample} cuestionarios (n = 0.9604·N / (0.0025·(N−1) + 0.9604)); ${n >= sample ? "se cumplió" : "no se alcanzó"} la muestra requerida.`}
        </P>
        {report?.activities && <P>{report.activities}</P>}

        <H2 n="4.">Método</H2>
        <P>
          Cada reactivo se responde en escala de frecuencia (Siempre, Casi siempre, Algunas veces, Casi nunca, Nunca) y se califica de 0 a 4 según la tabla de la guía; en los reactivos redactados en positivo la escala se invierte.
          La calificación de cada dominio, categoría y la calificación final se obtienen sumando los reactivos que los integran, y se clasifican en cinco niveles con los rangos de la guía.
          Los reactivos de atención a clientes y de personal a cargo solo se califican cuando el trabajador responde “Sí” a la pregunta correspondiente. Los resultados del centro son el promedio de las calificaciones individuales;
          grupos con menos de {MIN_GROUP} trabajadores no se reportan para proteger la confidencialidad.{moe ? ` El margen de error de la calificación final es de ± ${f1(moe)} puntos al 95% de confianza.` : ""}
          {ev.includeGuideI && " En la Guía I, se considera que un trabajador requiere valoración clínica si reporta un acontecimiento traumático severo y además al menos una respuesta afirmativa en la sección II, tres en la sección III o dos en la sección IV."}
        </P>
        <table className="mb-2 w-full border-collapse">
          <thead><tr><TH>Rangos de calificación</TH>{LEVELS.map((l) => <TH key={l} right>{LEVEL_LABEL[l].split(" ")[0]}</TH>)}</tr></thead>
          <tbody>
            {[["Calificación final", g.finalCuts], ...Object.entries(g.categoryCuts).map(([k, v]) => [k, v] as const)].map(([k, c]) => {
              const cuts = c as readonly number[];
              return (
                <tr key={k as string}><TD bold={k === "Calificación final"}>{k as string}</TD>
                  <TD right>{`< ${cuts[0]}`}</TD><TD right>{`${cuts[0]}–<${cuts[1]}`}</TD><TD right>{`${cuts[1]}–<${cuts[2]}`}</TD><TD right>{`${cuts[2]}–<${cuts[3]}`}</TD><TD right>{`≥ ${cuts[3]}`}</TD></tr>
              );
            })}
          </tbody>
        </table>

        {agg && (
          <>
            <H2 n="5.">Resultados</H2>
            <h3 className="mb-1 text-[12.5px] font-bold">5.1 Calificación final y distribución de trabajadores</h3>
            <div className="mb-3 grid grid-cols-[1fr_1.4fr] items-center gap-6">
              <div>
                <div className="text-[11px] text-gray-600">Calificación final promedio</div>
                <div className="flex items-baseline gap-2"><span className="text-3xl font-bold">{f1(agg.final.mean)}</span><Chip level={agg.final.level} /></div>
                <div className="mt-2"><Bullet value={agg.final.mean} cuts={g.finalCuts} /></div>
              </div>
              <table className="w-full border-collapse"><tbody>
                {LEVELS.map((l) => (
                  <tr key={l}><TD><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: LV[l][0] }} />{LEVEL_LABEL[l]}</TD>
                    <TD right>{agg.final.distribution[l]}</TD><TD right>{pct(agg.final.distribution[l], n)}%</TD></tr>
                ))}
              </tbody></table>
            </div>
            <P><b>Criterio para la toma de acciones ({LEVEL_LABEL[agg.final.level].toLowerCase()}):</b> {LEVEL_ACTION[agg.final.level]}</P>

            <h3 className="mb-1 mt-4 text-[12.5px] font-bold">5.2 Resultados por categoría y dominio</h3>
            <table className="mb-2 w-full border-collapse">
              <thead><tr><TH>Categoría / dominio</TH><TH right>Calif.</TH><TH>Nivel</TH><TH>Posición en los rangos</TH><TH>Trabajadores por nivel</TH><TH right>Alto+</TH></tr></thead>
              <tbody>
                {agg.categories.map((c) => (
                  <Fragment key={c.name}>
                    <tr className="bg-gray-50"><TD bold>{c.name}</TD><TD right bold>{f1(c.mean)}</TD><TD><Chip level={c.level} /></TD>
                      <td className="w-[26%] border-b border-gray-200 px-1.5"><Bullet value={c.mean} cuts={g.categoryCuts[c.name]} /></td>
                      <td className="w-[22%] border-b border-gray-200 px-1.5"><Stack dist={c.distribution} total={n} /></td>
                      <TD right>{pct(c.distribution.ALTO + c.distribution.MUY_ALTO, n)}%</TD></tr>
                    {agg.domains.filter((d) => d.category === c.name).map((d) => (
                      <tr key={d.name}><TD><span className="pl-3 text-gray-700">{d.name}</span></TD><TD right>{f1(d.mean)}</TD><TD><Chip level={d.level} /></TD>
                        <td className="border-b border-gray-200 px-1.5"><Bullet value={d.mean} cuts={g.domainCuts[d.name]} max={maxDomain[d.name]} /></td>
                        <td className="border-b border-gray-200 px-1.5"><Stack dist={d.distribution} total={n} /></td>
                        <TD right>{pct(d.distribution.ALTO + d.distribution.MUY_ALTO, n)}%</TD></tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>

            {areas.length > 1 && (
              <>
                <h3 className="mb-1 mt-4 text-[12.5px] font-bold">5.3 Resultados por área</h3>
                <table className="mb-1 w-full border-collapse">
                  <thead><tr><TH>Área</TH><TH right>n</TH><TH right>Final</TH>{Object.keys(g.categories).map((c) => <TH key={c} right>{c.replace(" en el trabajo", "").replace(" de trabajo", "").replace("Factores propios de la actividad", "Factores propios")}</TH>)}</tr></thead>
                  <tbody>
                    {areas.map((a) => (
                      <tr key={a.name}><TD>{a.name}</TD><TD right>{a.n}</TD>
                        {a.hidden ? <td colSpan={1 + Object.keys(g.categories).length} className="border-b border-gray-200 px-1.5 text-[10.5px] text-gray-500">Grupo menor a {MIN_GROUP}: no se reporta</td> : (
                          <>
                            <td className="border-b border-gray-200 px-1 py-0.5 text-right"><span className="inline-block min-w-12 rounded px-1 text-[10.5px] font-semibold tabular-nums" style={{ background: LV[a.a.final.level][0], color: LV[a.a.final.level][1] }}>{f1(a.a.final.mean)}</span></td>
                            {a.a.categories.map((c) => <td key={c.name} className="border-b border-gray-200 px-1 py-0.5 text-right"><span className="inline-block min-w-12 rounded px-1 text-[10.5px] font-semibold tabular-nums" style={{ background: LV[c.level][0], color: LV[c.level][1] }}>{f1(c.mean)}</span></td>)}
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            <h3 className="mb-1 mt-4 text-[12.5px] font-bold">5.{areas.length > 1 ? 4 : 3} Reactivos con mayor riesgo</h3>
            <table className="mb-2 w-full border-collapse">
              <thead><tr><TH>#</TH><TH>Reactivo</TH><TH right>Puntos prom.</TH><TH right>Desfavorables</TH></tr></thead>
              <tbody>{items.map((it) => <tr key={it.k}><TD>{it.k}</TD><TD>{it.text}</TD><TD right>{it.mean.toFixed(2)}</TD><TD right>{it.unf}%</TD></tr>)}</tbody>
            </table>

            {ev.includeGuideI && (
              <>
                <h3 className="mb-1 mt-4 text-[12.5px] font-bold">5.{areas.length > 1 ? 5 : 4} Acontecimientos traumáticos severos (Guía I)</h3>
                <table className="mb-2 w-full border-collapse"><tbody>
                  <tr><TD>Trabajadores sin acontecimiento traumático severo</TD><TD right>{n - g1.event}</TD><TD right>{pct(n - g1.event, n)}%</TD></tr>
                  <tr><TD>Vivieron un acontecimiento, sin criterios de valoración clínica</TD><TD right>{g1.event - g1.req}</TD><TD right>{pct(g1.event - g1.req, n)}%</TD></tr>
                  <tr><TD bold>Requieren valoración clínica</TD><TD right bold>{g1.req}</TD><TD right bold>{pct(g1.req, n)}%</TD></tr>
                </tbody></table>
                {g1.req > 0 && <P>{GUIA_I_ACTION}</P>}
              </>
            )}

            {kpis.length > 0 && (
              <>
                <h3 className="mb-1 mt-4 text-[12.5px] font-bold">5.{(areas.length > 1 ? 5 : 4) + (ev.includeGuideI ? 1 : 0)} Indicadores de riesgo y de efectividad</h3>
                <table className="mb-2 w-full border-collapse">
                  <thead><tr><TH>Indicador</TH><TH right>Valor</TH><TH>Semáforo</TH><TH>Umbrales</TH></tr></thead>
                  <tbody>
                    {([1, 2, 3, 4] as const).flatMap((dim) => [
                      <tr key={"d" + dim}><td colSpan={4} className="bg-gray-50 px-1.5 py-1 text-[10.5px] font-semibold text-gray-700">{dim}. {DIM_NAMES[dim]}</td></tr>,
                      ...kpis.filter((k) => k.dim === dim && k.light !== "SIN_DATOS").map((k) => (
                        <tr key={k.id}><TD>{k.id} · {k.name}</TD><TD right>{k.display}{k.moe && k.moe > 0.05 ? ` ± ${f1(k.moe)}` : ""}</TD>
                          <TD><span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: LIGHT[k.light][0], color: LIGHT[k.light][1] }}>{LIGHT[k.light][2]}</span></TD>
                          <TD><span className="text-[10px] text-gray-600">{k.thresholds}</span></TD></tr>
                      )),
                    ])}
                  </tbody>
                </table>
              </>
            )}

            <H2 n="6.">Conclusiones</H2>
            {autoConclusions.map((t, i) => <P key={i}>{t}</P>)}
            {report?.conclusions && <P>{report.conclusions}</P>}

            <H2 n="7.">Recomendaciones y acciones de intervención</H2>
            {(["MEDIO", "ALTO", "MUY_ALTO"].includes(agg.final.level) || agg.categories.some((c) => ["MEDIO", "ALTO", "MUY_ALTO"].includes(c.level))) && (
              <P>Por el nivel de riesgo obtenido se debe elaborar un Programa de intervención que considere las áreas y trabajadores sujetos, el tipo de acciones y medidas de control, las fechas de ejecución, el control de avances, la evaluación posterior y el responsable de su ejecución.</P>
            )}
            {priority.map((d) => (
              <div key={d.name} className="mb-2 break-inside-avoid">
                <div className="flex items-center gap-2 text-[12px] font-semibold"><Chip level={d.level} />{d.name}<span className="font-normal text-gray-500">· {d.category}</span></div>
                <ul className="ml-5 mt-1 list-disc text-[11px] leading-relaxed text-gray-800">{INTERVENTIONS[d.name].actions.map((a) => <li key={a}>{a}</li>)}</ul>
              </div>
            ))}
            {actions.length > 0 && (
              <>
                <h3 className="mb-1 mt-3 text-[12.5px] font-bold">Acciones registradas en el programa de intervención</h3>
                <table className="mb-2 w-full border-collapse">
                  <thead><tr><TH>Dominio</TH><TH>Acción</TH><TH>Responsable</TH><TH>Compromiso</TH><TH>Estado</TH></tr></thead>
                  <tbody>{actions.map((a) => <tr key={a.id}><TD>{a.domain}</TD><TD>{a.action}</TD><TD>{a.owner ?? "—"}</TD><TD>{a.dueDate}</TD><TD>{a.doneAt ? `Concluida ${a.doneAt}` : a.dueDate < new Date().toISOString().slice(0, 10) ? "Vencida" : "En curso"}</TD></tr>)}</tbody>
                </table>
              </>
            )}

            <H2 n="8.">Responsable de la evaluación</H2>
            <div className="mt-10 grid grid-cols-2 gap-10 break-inside-avoid">
              <div className="border-t border-gray-400 pt-1 text-[11px]">
                <div className="font-semibold">{report?.responsibleName || "Nombre del responsable"}</div>
                <div className="text-gray-600">{report?.responsibleLicense ? `Cédula profesional ${report.responsibleLicense}` : "Cédula profesional (en su caso)"}</div>
              </div>
              <div className="text-[11px] text-gray-700">Fecha de elaboración del informe:<div className="font-semibold">{fdate(reportDate)}</div></div>
            </div>
          </>
        )}
        {!agg && <P>Aún no hay respuestas para generar el informe.</P>}
      </article>
    </div>
  );
}
