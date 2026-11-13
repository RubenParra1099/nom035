"use client";
import { LogoMark } from "@/components/Logo";
import { Fragment, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { ANSWERS, G2_TO_G3, GUIDES, itemsOfDomain, type GuideId } from "@/lib/nom035/guides";
import { G1_SECTIONS } from "@/lib/nom035/guia1";
import { DEMO_QUESTIONS, PHYSICAL_ITEMS, PHYSICAL_OPTIONS } from "@/lib/nom035/demographics";
import { buildTemplate } from "@/lib/nom035/template";

type Tab = "I" | "II" | "III";
type Mode = "trabajador" | "especialista" | "impresion";

const TABS: { id: Tab; label: string; sub: string }[] = [
  { id: "I", label: "Guía I", sub: "Acontecimientos traumáticos severos · 20 preguntas" },
  { id: "II", label: "Guía II", sub: "Factores de riesgo psicosocial · 46 reactivos" },
  { id: "III", label: "Guía III", sub: "Riesgo psicosocial y entorno organizacional · 72 reactivos" },
];
const INFO: Record<Tab, { aplica: string; respuestas: string; objetivo: string }> = {
  I: { aplica: "Todos los centros de trabajo, sin importar su tamaño", respuestas: "Sí / No",
    objetivo: "Identificar a los trabajadores que fueron sujetos a acontecimientos traumáticos severos durante o con motivo del trabajo y que requieren valoración clínica." },
  II: { aplica: "Centros de trabajo de 16 a 50 trabajadores", respuestas: "Siempre · Casi siempre · Algunas veces · Casi nunca · Nunca",
    objetivo: "Identificar y analizar los factores de riesgo psicosocial: ambiente de trabajo, factores propios de la actividad, organización del tiempo y liderazgo y relaciones." },
  III: { aplica: "Centros de trabajo de más de 50 trabajadores", respuestas: "Siempre · Casi siempre · Algunas veces · Casi nunca · Nunca",
    objetivo: "Identificar y analizar los factores de riesgo psicosocial y evaluar el entorno organizacional (reconocimiento, pertenencia y estabilidad)." },
};
const MODES: { id: Mode; label: string; desc: string }[] = [
  { id: "trabajador", label: "Cuestionario", desc: "Como lo responde el trabajador" },
  { id: "especialista", label: "Ficha técnica", desc: "Dominio, categoría y puntaje de cada reactivo" },
  { id: "impresion", label: "Formato impreso", desc: "Para aplicar en papel y capturar después" },
];
const G1_RULE = ["Si todas las respuestas son No, el cuestionario termina aquí.", "Requiere valoración si hay al menos 1 Sí.", "Requiere valoración si hay al menos 3 Sí.", "Requiere valoración si hay al menos 2 Sí."];
const FILTER_Q = { clientes: "En mi trabajo debo brindar servicio a clientes o usuarios", jefe: "Soy jefe de otros trabajadores" } as const;

export default function GuideCatalog() {
  const [tab, setTab] = useState<Tab>("III");
  const [mode, setMode] = useState<Mode>("trabajador");
  const [q, setQ] = useState("");
  const [withDemo, setWithDemo] = useState(true);
  const [withG1, setWithG1] = useState(true);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const g = p.get("guia"), m = p.get("modo");
    if (g === "I" || g === "II" || g === "III") setTab(g);
    if (m === "trabajador" || m === "especialista" || m === "impresion") setMode(m);
  }, []);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    p.set("guia", tab); p.set("modo", mode);
    window.history.replaceState(null, "", `${window.location.pathname}?${p.toString()}`);
  }, [tab, mode]);

  const gid: GuideId | null = tab === "II" ? "GUIA_II" : tab === "III" ? "GUIA_III" : null;
  const g = gid ? GUIDES[gid] : null;
  const map = useMemo(() => (g ? itemsOfDomain(g) : {}), [g]);
  const t = q.trim().toLowerCase();
  const match = (text: string, n?: number) => !t || text.toLowerCase().includes(t) || String(n) === t;

  function downloadTemplate() {
    if (!gid) return;
    const { header, instructions } = buildTemplate(gid, { departments: [], positions: [], includeGuideI: true });
    const wb = XLSX.utils.book_new();
    const cap = XLSX.utils.aoa_to_sheet([header]);
    cap["!cols"] = header.map((h) => ({ wch: /^\[\d+\.-/.test(h) ? 16 : 22 }));
    XLSX.utils.book_append_sheet(wb, cap, "Captura");
    const ins = XLSX.utils.aoa_to_sheet(instructions);
    ins["!cols"] = [{ wch: 70 }, { wch: 90 }];
    XLSX.utils.book_append_sheet(wb, ins, "Instrucciones");
    const data = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const url = URL.createObjectURL(new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const a = document.createElement("a");
    a.href = url; a.download = `Plantilla_NOM035_Guia${tab}.xlsx`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const counts = g ? { items: g.items, sections: g.sections.length, domains: Object.keys(g.domains).length, cats: Object.keys(g.categories).length } : null;

  return (
    <div className="space-y-5">
      <div className="print:hidden">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Guías de referencia</h1>
        <p className="text-sm text-gray-500">Los cuestionarios de la NOM-035-STPS-2018 en sus tres modalidades: como los ve el trabajador, con su ficha técnica y en formato para imprimir.</p>
      </div>

      {/* Guía */}
      <div className="grid gap-3 sm:grid-cols-3 print:hidden" role="tablist" aria-label="Guía">
        {TABS.map((x) => (
          <button key={x.id} role="tab" aria-selected={tab === x.id} onClick={() => setTab(x.id)}
            className={`card p-4 text-left transition ${tab === x.id ? "ring-2 ring-brand-600" : "hover:border-brand-600"}`}>
            <div className="text-base font-semibold text-ink">{x.label}</div>
            <div className="text-xs text-gray-500">{x.sub}</div>
          </button>
        ))}
      </div>

      {/* Ficha de la guía */}
      <section className="card p-5 print:hidden">
        <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
          <div>
            <h2 className="text-lg font-semibold text-ink">{tab === "I" ? "Guía de Referencia I" : g!.name}</h2>
            <p className="mt-1 text-sm text-gray-700">{INFO[tab].objetivo}</p>
            <dl className="mt-3 grid grid-cols-[8rem_1fr] gap-y-1 text-sm">
              <dt className="text-gray-500">Se aplica a</dt><dd className="text-ink">{INFO[tab].aplica}</dd>
              <dt className="text-gray-500">Respuestas</dt><dd className="text-ink">{INFO[tab].respuestas}</dd>
              {counts && <><dt className="text-gray-500">Estructura</dt><dd className="text-ink">{counts.items} reactivos · {counts.sections} secciones · {counts.domains} dominios · {counts.cats} categorías</dd></>}
              {g && <><dt className="text-gray-500">Condicionados</dt><dd className="text-ink">Reactivos {g.clientItems.join(", ")} (atención a clientes) y {g.bossItems.join(", ")} (jefes)</dd></>}
            </dl>
          </div>
          <div className="flex flex-col gap-2 md:items-end">
            {gid && <button className="btn-secondary w-full md:w-auto" onClick={downloadTemplate}>Descargar plantilla de Excel</button>}
            <button className="btn-secondary w-full md:w-auto" onClick={() => { setMode("impresion"); setTimeout(() => window.print(), 300); }}>Imprimir formato en papel</button>
            <p className="text-xs text-gray-500 md:text-right">Para aplicarla en línea, cree una evaluación desde la página de la empresa.</p>
          </div>
        </div>
      </section>

      {/* Modalidad */}
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <div className="inline-flex rounded-xl bg-gray-100 p-1" role="tablist" aria-label="Modalidad">
          {MODES.map((m) => (
            <button key={m.id} role="tab" aria-selected={mode === m.id} onClick={() => setMode(m.id)} title={m.desc}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${mode === m.id ? "bg-surface text-ink shadow-sm" : "text-gray-500 hover:text-gray-800"}`}>{m.label}</button>
          ))}
        </div>
        <span className="text-sm text-gray-500">{MODES.find((m) => m.id === mode)!.desc}</span>
        {mode !== "impresion" && <input className="input ml-auto max-w-xs" placeholder="Buscar texto o número…" value={q} onChange={(e) => setQ(e.target.value)} />}
        {mode === "impresion" && (
          <div className="ml-auto flex flex-wrap items-center gap-4 text-sm">
            {gid && <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={withDemo} onChange={(e) => setWithDemo(e.target.checked)} />Datos generales</label>}
            {gid && <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={withG1} onChange={(e) => setWithG1(e.target.checked)} />Incluir Guía I</label>}
            <button className="btn-primary" onClick={() => window.print()}>Imprimir / PDF</button>
          </div>
        )}
      </div>

      {mode === "trabajador" && (tab === "I" ? <G1Worker match={match} /> : <WorkerView gid={gid!} match={match} />)}
      {mode === "especialista" && (tab === "I" ? <G1Specialist match={match} /> : <SpecialistView gid={gid!} map={map} match={match} />)}
      {mode === "impresion" && <PrintView tab={tab} gid={gid} withDemo={withDemo} withG1={withG1} />}
    </div>
  );
}

/* ---------------- Vista del trabajador ---------------- */
function Options({ labels }: { labels: readonly string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {labels.map((a) => <span key={a} className="rounded-full border border-gray-300 px-2.5 py-0.5 text-xs text-gray-600">{a}</span>)}
    </div>
  );
}
function WorkerView({ gid, match }: { gid: GuideId; match: (t: string, n?: number) => boolean }) {
  const g = GUIDES[gid];
  return (
    <div className="space-y-4">
      {g.sections.map((s) => {
        const items = s.items.filter((n) => match(g.text(n), n));
        if (!items.length) return null;
        return (
          <section key={s.title} className="card p-5">
            {s.filter && (
              <div className="mb-3 rounded-lg bg-surface-2 px-3 py-2 text-sm">
                <span className="font-semibold text-ink">{FILTER_Q[s.filter]}</span> <span className="text-gray-500">— Sí / No. Si responde No, esta sección se omite.</span>
              </div>
            )}
            <h3 className="mb-3 text-sm font-semibold text-ink">{s.title}</h3>
            <ol className="divide-y divide-gray-100">
              {items.map((n) => (
                <li key={n} className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm text-ink"><span className="mr-2 tabular-nums text-gray-400">{n}.</span>{g.text(n)}</span>
                  <Options labels={ANSWERS} />
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
function G1Worker({ match }: { match: (t: string, n?: number) => boolean }) {
  let k = 0;
  return (
    <div className="space-y-4">
      {G1_SECTIONS.map((s, si) => (
        <section key={s.key} className="card p-5">
          <h3 className="text-sm font-semibold text-ink">Sección {s.key}. {s.title}</h3>
          {s.prompt && <p className="mt-1 text-sm text-gray-600">{s.prompt}</p>}
          <ol className="mt-2 divide-y divide-gray-100">
            {s.items.map((it) => { k++; const n = k; return match(it, n) ? (
              <li key={n} className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-ink"><span className="mr-2 tabular-nums text-gray-400">{n}.</span>{it}</span>
                <Options labels={["Sí", "No"]} />
              </li>) : null; })}
          </ol>
          <p className="mt-2 text-xs text-gray-500">{G1_RULE[si]}</p>
        </section>
      ))}
    </div>
  );
}

/* ---------------- Ficha técnica ---------------- */
function SpecialistView({ gid, map, match }: { gid: GuideId; map: Record<number, { domain: string; category: string }>; match: (t: string, n?: number) => boolean }) {
  const g = GUIDES[gid];
  return (
    <div className="space-y-4">
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[860px]">
          <thead className="border-b border-gray-200 bg-surface-2"><tr>
            <th className="th w-12">#</th><th className="th">Reactivo</th><th className="th">Categoría</th><th className="th">Dominio</th><th className="th">Sentido</th>
            {gid === "GUIA_II" && <th className="th">Guía III</th>}
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {g.sections.map((s) => {
              const items = s.items.filter((n) => match(g.text(n), n));
              if (!items.length) return null;
              return (
                <Fragment key={s.title}>
                  <tr className="bg-surface-2/60"><td colSpan={gid === "GUIA_II" ? 6 : 5} className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {s.title}{s.filter ? ` · solo si ${s.filter === "clientes" ? "atiende clientes" : "es jefe"}` : ""}</td></tr>
                  {items.map((n) => (
                    <tr key={n}>
                      <td className="td tabular-nums text-gray-500">{n}</td>
                      <td className="td text-ink">{g.text(n)}</td>
                      <td className="td text-xs text-gray-700">{map[n]?.category}</td>
                      <td className="td text-xs text-gray-700">{map[n]?.domain}</td>
                      <td className="td whitespace-nowrap text-xs">{g.inverse.has(n)
                        ? <span className="rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-700">Positivo · Siempre = 0</span>
                        : <span className="rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-700">Negativo · Siempre = 4</span>}</td>
                      {gid === "GUIA_II" && <td className="td tabular-nums text-xs text-gray-500">{G2_TO_G3[n]}</td>}
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <Structure gid={gid} />
      <section className="card p-5">
        <h3 className="mb-2 text-sm font-semibold text-ink">Valor de las respuestas</h3>
        <table className="w-full max-w-2xl text-sm">
          <thead><tr><th className="th">Tipo de reactivo</th>{ANSWERS.map((a) => <th key={a} className="th text-center">{a}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-100">
            <tr><td className="td">Negativo</td>{[4, 3, 2, 1, 0].map((v, i) => <td key={i} className="td text-center tabular-nums">{v}</td>)}</tr>
            <tr><td className="td">Positivo</td>{[0, 1, 2, 3, 4].map((v, i) => <td key={i} className="td text-center tabular-nums">{v}</td>)}</tr>
          </tbody>
        </table>
        <p className="mt-2 text-xs text-gray-500">Calificación del dominio = suma de sus reactivos; de la categoría = suma de sus dominios; final = suma de todos. Los rangos de nivel están en el Anexo A del manual.</p>
      </section>
    </div>
  );
}
function Structure({ gid }: { gid: GuideId }) {
  const g = GUIDES[gid];
  return (
    <section className="card p-5">
      <h3 className="mb-3 text-sm font-semibold text-ink">Estructura: categorías y dominios</h3>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Object.entries(g.categories).map(([c, ds]) => (
          <div key={c} className="rounded-lg border border-line p-3">
            <div className="text-sm font-semibold text-ink">{c}</div>
            <ul className="mt-1 space-y-1 text-sm">
              {ds.map((d) => <li key={d} className="flex justify-between gap-2 text-gray-700"><span>{d}</span><span className="shrink-0 text-xs tabular-nums text-gray-500">{g.domains[d].length} reactivos</span></li>)}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
function G1Specialist({ match }: { match: (t: string, n?: number) => boolean }) {
  return (
    <div className="space-y-4">
      <section className="card p-5">
        <h3 className="text-sm font-semibold text-ink">Criterio para requerir valoración clínica</h3>
        <p className="mt-1 text-sm text-gray-700">El trabajador requiere valoración clínica cuando respondió <b>Sí</b> en alguna pregunta de la sección I y además cumple al menos una condición:</p>
        <ul className="mt-2 grid gap-2 sm:grid-cols-3">
          {[["Sección II", "1 o más Sí", "Recuerdos persistentes"], ["Sección III", "3 o más Sí", "Esfuerzo por evitar"], ["Sección IV", "2 o más Sí", "Afectación"]].map(([a, b, c]) => (
            <li key={a} className="rounded-lg bg-surface-2 p-3"><div className="text-xs text-gray-500">{a} · {c}</div><div className="text-base font-semibold text-ink">{b}</div></li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-gray-500">En la plataforma, cada caso que cumple el criterio se crea automáticamente en Seguimiento Guía I.</p>
      </section>
      <G1Worker match={match} />
    </div>
  );
}

/* ---------------- Formato impreso ---------------- */
const box = <span className="inline-block h-3.5 w-3.5 rounded-sm border border-gray-500 align-middle" />;
function PrintView({ tab, gid, withDemo, withG1 }: { tab: Tab; gid: GuideId | null; withDemo: boolean; withG1: boolean }) {
  const g = gid ? GUIDES[gid] : null;
  return (
    <div className="report-paper mx-auto max-w-[8.5in] rounded-xl border border-line bg-white p-8 text-[12px] text-gray-900 shadow-sm print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
      <div className="flex items-start justify-between gap-4 border-b border-gray-300 pb-3">
        <div className="flex items-center gap-3">
          <LogoMark size={40} />
          <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">NOM-035-STPS-2018</div>
          <div className="text-lg font-semibold">{tab === "I" ? "Guía de Referencia I · Acontecimientos traumáticos severos" : g!.name}</div>
          </div>
        </div>
        <div className="text-right text-[11px] text-gray-500">Folio: ________</div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-x-6 gap-y-2 text-[11px]">
        <div>Empresa: ______________________</div><div>Centro de trabajo: _______________</div><div>Fecha: ____ / ____ / ______</div>
      </div>
      <div className="mt-3 rounded border border-gray-300 p-2 text-[11px] leading-snug">
        <b>Instrucciones.</b> Sus respuestas son confidenciales y anónimas; no escriba su nombre. No hay respuestas correctas o incorrectas.
        {tab === "I" ? " Marque Sí o No en cada pregunta." : " Marque con una X una sola opción por pregunta, según lo que ocurre en su trabajo."}
      </div>

      {gid && withDemo && (
        <div className="mt-4 break-inside-avoid">
          <h3 className="mb-1 text-[12px] font-semibold uppercase tracking-wide">Datos generales</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            {DEMO_QUESTIONS.map((d) => (
              <div key={d.key} className="text-[11px]"><b>{d.label}:</b>{" "}
                {d.options && d.options.length <= 5 ? d.options.map((o) => <span key={o} className="mr-2 whitespace-nowrap">{box} {o}</span>) : <span>__________________________</span>}
              </div>
            ))}
          </div>
          <h3 className="mb-1 mt-3 text-[12px] font-semibold uppercase tracking-wide">Condiciones del entorno físico</h3>
          <table className="w-full border-collapse text-[11px]">
            <thead><tr><th className="border border-gray-300 px-1 py-0.5 text-left">Condición</th>{PHYSICAL_OPTIONS.map((o) => <th key={o} className="border border-gray-300 px-1 py-0.5">{o}</th>)}</tr></thead>
            <tbody>{PHYSICAL_ITEMS.map((p) => <tr key={p}><td className="border border-gray-300 px-1 py-0.5">{p}</td>{PHYSICAL_OPTIONS.map((o) => <td key={o} className="border border-gray-300 text-center">{box}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )}

      {(tab === "I" || withG1) && (
        <div className="mt-4">
          <h3 className="mb-1 text-[12px] font-semibold uppercase tracking-wide">{tab === "I" ? "Cuestionario" : "Guía I · Acontecimientos traumáticos severos"}</h3>
          {G1_SECTIONS.map((s, si) => (
            <table key={s.key} className="mb-2 w-full border-collapse text-[11px] break-inside-avoid">
              <thead><tr><th className="border border-gray-300 px-1 py-0.5 text-left">{s.key}. {s.title}{s.prompt ? ` — ${s.prompt}` : ""}</th><th className="w-10 border border-gray-300">Sí</th><th className="w-10 border border-gray-300">No</th></tr></thead>
              <tbody>{s.items.map((it, i) => <tr key={i}><td className="border border-gray-300 px-1 py-0.5">{it}</td><td className="border border-gray-300 text-center">{box}</td><td className="border border-gray-300 text-center">{box}</td></tr>)}</tbody>
              {si === 0 && <caption className="caption-bottom pt-0.5 text-left text-[10px] text-gray-500">Si todas sus respuestas en la sección I fueron No, pase a la siguiente parte del cuestionario.</caption>}
            </table>
          ))}
        </div>
      )}

      {g && (
        <div className="mt-4">
          <h3 className="mb-1 text-[12px] font-semibold uppercase tracking-wide">{tab === "II" ? "Guía II" : "Guía III"} · Factores de riesgo psicosocial</h3>
          {g.sections.map((s) => (
            <div key={s.title} className="mb-2 break-inside-avoid">
              {s.filter && <div className="mb-1 text-[11px]"><b>{FILTER_Q[s.filter]}:</b> <span className="mr-2">{box} Sí</span><span>{box} No (si responde No, pase a la siguiente sección)</span></div>}
              <table className="w-full border-collapse text-[11px]">
                <thead><tr><th className="border border-gray-300 px-1 py-0.5 text-left">{s.title}</th>{ANSWERS.map((a) => <th key={a} className="w-[52px] border border-gray-300 px-0.5 py-0.5 text-[9.5px] leading-tight">{a}</th>)}</tr></thead>
                <tbody>{s.items.map((n) => <tr key={n}><td className="border border-gray-300 px-1 py-0.5"><span className="mr-1 text-gray-500">{n}.</span>{g.text(n)}</td>{ANSWERS.map((a) => <td key={a} className="border border-gray-300 text-center">{box}</td>)}</tr>)}</tbody>
              </table>
            </div>
          ))}
        </div>
      )}
      <p className="mt-4 text-center text-[10px] text-gray-500">Gracias por su participación. Este formato se captura en la plataforma con la plantilla de Excel de la evaluación.</p>
    </div>
  );
}
