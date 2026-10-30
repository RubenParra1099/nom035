import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { audit, requireUser } from "@/lib/auth";
import { folioOf } from "@/lib/results";
import { ANSWERS, GUIDES, LEVEL_LABEL, type Level } from "@/lib/nom035/guides";
import { scoreWorker } from "@/lib/nom035/score";
import { G1_SECTIONS, evaluateG1 } from "@/lib/nom035/guia1";
import { DEMO_QUESTIONS } from "@/lib/nom035/demographics";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

const LV: Record<Level, [string, string]> = {
  NULO: ["var(--lv-nulo)", "var(--lv-nulo-ink)"], BAJO: ["var(--lv-bajo)", "var(--lv-bajo-ink)"], MEDIO: ["var(--lv-medio)", "var(--lv-medio-ink)"],
  ALTO: ["var(--lv-alto)", "var(--lv-alto-ink)"], MUY_ALTO: ["var(--lv-muyalto)", "var(--lv-muyalto-ink)"],
};
const RISK = ["var(--risk-0)", "var(--risk-1)", "var(--risk-2)", "var(--risk-3)", "var(--risk-4)"];
const ATS_STATUS: Record<string, string> = {
  IDENTIFICADO: "Identificado", CANALIZADO: "Canalizado", EN_ATENCION: "En atención", ATENDIDO: "Atendido", NO_LOCALIZABLE: "No localizable (anónimo)",
};
const G1_OFFSET = [0, 6, 8, 15];
const G1_RULE = ["Al menos 1 Sí", "Al menos 1 Sí", "Al menos 3 Sí", "Al menos 2 Sí"];
const G1_MIN = [1, 1, 3, 2];

function Badge({ level, children }: { level: Level; children?: React.ReactNode }) {
  return <span className="inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: LV[level][0], color: LV[level][1] }}>{children ?? LEVEL_LABEL[level]}</span>;
}

export default async function WorkerSheet({ params }: { params: Promise<{ id: string; rid: string }> }) {
  const { id, rid } = await params;
  const s = await requireUser(["SUPERADMIN", "CONSULTOR"]);
  const ev = await db.query.evaluations.findFirst({ where: eq(schema.evaluations.id, id), with: { workplace: { with: { company: true } } } });
  // Se puede abrir por id de la respuesta o por su folio anónimo (desde la ficha técnica del reactivo)
  let r = await db.query.responses.findFirst({ where: and(eq(schema.responses.id, rid), eq(schema.responses.evaluationId, id)) });
  if (!r && /^[0-9A-F]{6}$/i.test(rid)) {
    const ids = await db.select({ id: schema.responses.id }).from(schema.responses).where(eq(schema.responses.evaluationId, id));
    const hit = ids.find((x) => folioOf(x.id) === rid.toUpperCase());
    if (hit) r = await db.query.responses.findFirst({ where: eq(schema.responses.id, hit.id) });
  }
  if (!ev || !r) notFound();
  const [contact, follow] = await Promise.all([
    db.query.confidentialContacts.findFirst({ where: eq(schema.confidentialContacts.responseId, r.id) }),
    db.query.atsFollowups.findFirst({ where: eq(schema.atsFollowups.responseId, r.id) }),
  ]);
  await audit(s, "view-worker-sheet", "response", r.id);

  const g = GUIDES[ev.guide];
  const items = r.items as Record<string, number | null>;
  const sc = scoreWorker(ev.guide, Object.fromEntries(Object.entries(items).map(([k, v]) => [Number(k), v])));
  const g1 = r.guideI ?? [];
  const g1r = evaluateG1(g1);
  const folio = folioOf(r.id);
  const pts = (n: number, v: number) => (g.inverse.has(n) ? v : 4 - v);
  const answered = Object.values(items).filter((v) => v !== null && v !== undefined).length;
  const unfav = Object.entries(items).filter(([n, v]) => v !== null && v !== undefined && pts(Number(n), v) >= 3).length;
  const back = `/admin/evaluaciones/${id}/confidencial`;

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <Link href={back} className="text-sm font-medium text-brand-700 hover:underline">← Seguimiento Guía I</Link>
        <PrintButton />
      </div>

      <section className="card p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Ficha del trabajador · Confidencial</p>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{contact?.name ?? "Trabajador anónimo"}</h1>
            <p className="text-sm text-gray-500">{ev.workplace.company.name} · {ev.workplace.name} · {ev.name} · {g.name}</p>
          </div>
          <div className="text-right text-sm text-gray-600">
            <div>Folio <span className="font-mono font-semibold text-gray-900">{folio}</span></div>
            <div>Respondió el {r.submittedAt.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}</div>
            <div className="text-xs text-gray-400">{r.source === "IMPORTACION" ? "Importado desde Excel" : "Capturado en línea"}</div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-line p-3"><div className="text-[11px] uppercase tracking-wide text-gray-500">Calificación final</div>
            <div className="mt-1 flex items-center gap-2"><span className="text-2xl font-semibold tabular-nums">{sc.final}</span><Badge level={sc.finalLevel} /></div></div>
          <div className="rounded-lg border border-line p-3"><div className="text-[11px] uppercase tracking-wide text-gray-500">Guía I</div>
            <div className={`mt-1 text-sm font-semibold ${g1r.requiresEvaluation ? "text-red-600" : "text-gray-800"}`}>{g1r.requiresEvaluation ? "Requiere valoración clínica" : g1r.event ? "Vivió ATS, sin criterios" : r.guideI ? "Sin acontecimiento" : "No aplicada"}</div></div>
          <div className="rounded-lg border border-line p-3"><div className="text-[11px] uppercase tracking-wide text-gray-500">Respuestas desfavorables</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{unfav}<span className="text-sm font-normal text-gray-500"> de {answered}</span></div></div>
          <div className="rounded-lg border border-line p-3"><div className="text-[11px] uppercase tracking-wide text-gray-500">Seguimiento</div>
            <div className="mt-1 text-sm font-semibold text-gray-800">{follow ? ATS_STATUS[follow.status] : contact ? (contact.attended ? "Atendido" : "Solicitó atención") : "—"}</div>
            {follow && <div className="text-xs text-gray-500">Identificado {follow.identifiedAt}{follow.canalizedAt ? ` · canalizado ${follow.canalizedAt}` : ""}{follow.institution ? ` · ${follow.institution}` : ""}</div>}</div>
        </div>
        {(follow?.notes || contact?.notes) && <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-sm text-gray-700"><b>Notas:</b> {follow?.notes || contact?.notes}</p>}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 text-base font-semibold text-gray-900">Datos generales</h2>
          <dl className="grid grid-cols-[minmax(0,11rem)_1fr] gap-x-3 gap-y-1.5 text-sm">
            {DEMO_QUESTIONS.map((q) => <Fragment key={q.key}><dt className="text-gray-500">{q.label.replace(/ \(.*\)$/, "")}</dt><dd className="text-gray-900">{r.demographics[q.key] || "—"}</dd></Fragment>)}
            <dt className="text-gray-500">Atiende clientes o usuarios</dt><dd>{r.servesClients === null ? "—" : r.servesClients ? "Sí" : "No"}</dd>
            <dt className="text-gray-500">Es jefe de otros trabajadores</dt><dd>{r.isBoss === null ? "—" : r.isBoss ? "Sí" : "No"}</dd>
          </dl>
          {Object.keys(r.physical).length > 0 && (<>
            <h3 className="mb-2 mt-4 text-sm font-semibold text-gray-900">Condiciones del entorno físico</h3>
            <dl className="grid grid-cols-[minmax(0,11rem)_1fr] gap-x-3 gap-y-1 text-sm">
              {Object.entries(r.physical).map(([k, v]) => <Fragment key={k}><dt className="text-gray-500">{k}</dt><dd>{v || "—"}</dd></Fragment>)}
            </dl></>)}
        </section>

        <section className="card p-5">
          <h2 className="mb-3 text-base font-semibold text-gray-900">Categorías y dominios</h2>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              {Object.entries(g.categories).map(([cat, doms]) => (
                <Fragment key={cat}>
                  <tr className="bg-surface-2"><td className="px-2 py-1.5 font-semibold">{cat}</td><td className="px-2 py-1.5 text-right font-semibold tabular-nums">{sc.categories[cat]}</td><td className="px-2 py-1.5 text-right"><Badge level={sc.categoryLevels[cat]} /></td></tr>
                  {doms.map((d) => <tr key={d}><td className="py-1 pl-5 pr-2 text-gray-700">{d}</td><td className="px-2 py-1 text-right tabular-nums">{sc.domains[d]}</td><td className="px-2 py-1 text-right"><Badge level={sc.domainLevels[d]} /></td></tr>)}
                </Fragment>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      {r.guideI && (
        <section className="card p-5">
          <h2 className="mb-1 text-base font-semibold text-gray-900">Guía I · Acontecimientos traumáticos severos</h2>
          <p className="mb-3 text-xs text-gray-500">Requiere valoración clínica si la sección I tiene algún Sí y además: sección II ≥ 1, sección III ≥ 3 o sección IV ≥ 2.</p>
          <div className="grid gap-4 lg:grid-cols-2">
            {G1_SECTIONS.map((sec, si) => {
              const vals = sec.items.map((_, i) => g1[G1_OFFSET[si] + i]);
              const yes = vals.filter((v) => v === true).length;
              const met = yes >= G1_MIN[si];
              return (
                <div key={sec.key} className="rounded-lg border border-line p-3">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">{sec.key}. {sec.title}</h3>
                    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${met ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-600"}`}>{yes} Sí · {G1_RULE[si]}</span>
                  </div>
                  <ul className="space-y-1 text-sm">
                    {sec.items.map((t, i) => {
                      const v = vals[i];
                      return <li key={i} className="flex justify-between gap-3"><span className="text-gray-700">{t}</span>
                        <span className={`shrink-0 font-semibold ${v === true ? "text-red-600" : v === false ? "text-gray-500" : "text-gray-300"}`}>{v === true ? "Sí" : v === false ? "No" : "—"}</span></li>;
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="card p-5">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div><h2 className="text-base font-semibold text-gray-900">Respuestas a los {g.items} reactivos</h2>
            <p className="text-xs text-gray-500">Los puntos van de 0 (sin riesgo) a 4 (máximo riesgo). En reactivos positivos, “Siempre” vale 0.</p></div>
          <div className="flex flex-wrap gap-3 text-xs text-gray-600">{["Sin riesgo (0)", "Bajo (1)", "Intermedio (2)", "Alto (3)", "Máximo (4)"].map((l, i) => <span key={l} className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: RISK[i] }} />{l}</span>)}</div>
        </div>
        <div className="space-y-4">
          {g.sections.map((sec) => (
            <div key={sec.title}>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{sec.title}{sec.filter === "clientes" ? ` · Atiende clientes: ${r.servesClients ? "Sí" : "No"}` : sec.filter === "jefe" ? ` · Es jefe: ${r.isBoss ? "Sí" : "No"}` : ""}</h3>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  {sec.items.map((n) => {
                    const v = items[n];
                    const has = v !== null && v !== undefined;
                    const p = has ? pts(n, v) : null;
                    return (
                      <tr key={n} className={p !== null && p >= 3 ? "bg-red-50/40" : ""}>
                        <td className="w-10 px-2 py-1 text-gray-400 tabular-nums">{n}</td>
                        <td className="px-2 py-1 text-gray-800">{g.text(n)}</td>
                        <td className="w-36 px-2 py-1">{has ? <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: RISK[p!] }} />{ANSWERS[v]}</span> : <span className="text-gray-400">No aplica</span>}</td>
                        <td className="w-12 px-2 py-1 text-right font-semibold tabular-nums">{p ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </section>

      {r.comment && <section className="card p-5"><h2 className="mb-2 text-base font-semibold text-gray-900">Comentario del trabajador</h2><p className="text-sm text-gray-700">{r.comment}</p></section>}

      <p className="text-xs text-gray-500">Información confidencial. Úsala solo para canalizar y dar seguimiento a la atención del trabajador; nunca para evaluarlo, sancionarlo ni compartirla con su jefe. Cada consulta de esta ficha queda registrada en la bitácora.</p>
    </div>
  );
}
