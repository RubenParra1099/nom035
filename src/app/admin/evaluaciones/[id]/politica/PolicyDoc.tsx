"use client";
import { useRef, useState } from "react";
import Help from "@/components/ui/Help";

type Commitment = { id: string; title: string; numeral: string; text: string; tier: string | null };
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const today = () => { const d = new Date(); return `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`; };

/** Borrador editable de la política de prevención de riesgos psicosociales (NOM-035, numeral 5.1). */
export default function PolicyDoc({ company, workplace, evaluation, result, commitments, editable }: {
  company: string; workplace: string; evaluation: string; editable: boolean;
  result: { level: string; mean: string; hiPct: number; n: number } | null; commitments: Commitment[];
}) {
  const list = commitments.filter((c) => c.id !== "POL-PREV");
  const [sel, setSel] = useState<string[]>(list.filter((c) => c.tier).map((c) => c.id));
  const [f, setF] = useState({
    rep: "", cargo: "Director(a) General", resp: "Recursos Humanos", lugar: "", fecha: today(),
    canales: "buzón físico confidencial, correo electrónico confidencial y entrevista con Recursos Humanos",
    difusion: "inducción de personal, tableros de avisos, intranet y correo electrónico",
  });
  const doc = useRef<HTMLDivElement>(null);
  const chosen = list.filter((c) => sel.includes(c.id));
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  function downloadWord() {
    if (!doc.current) return;
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>Política de prevención</title>
      <style>body{font-family:Arial,sans-serif;font-size:11pt;line-height:1.45;color:#111}h1{font-size:18pt;color:#0F2A5F;margin:0 0 4pt}h2{font-size:12.5pt;color:#0F2A5F;margin:14pt 0 4pt}
      p,li{margin:0 0 6pt;text-align:justify}.muted{color:#555;font-size:9.5pt}.sign{margin-top:48pt;border-top:1px solid #333;width:260pt;padding-top:4pt}</style></head><body>${doc.current.innerHTML}</body></html>`;
    const url = URL.createObjectURL(new Blob(["﻿", html], { type: "application/msword" }));
    const a = document.createElement("a"); a.href = url; a.download = `Politica_prevencion_${company.replace(/[^A-Za-z0-9]+/g, "_")}.doc`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="space-y-4 print:hidden lg:sticky lg:top-6 lg:self-start">
        <section className="card space-y-3 p-5">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">Datos del documento<Help id="politica" /></h2>
          {([["rep", "Nombre de quien firma"], ["cargo", "Cargo"], ["resp", "Área responsable de la política"], ["lugar", "Lugar"], ["fecha", "Fecha"]] as const).map(([k, l]) => (
            <div key={k}><label className="label">{l}</label><input className="input" value={f[k]} onChange={set(k)} disabled={!editable} /></div>
          ))}
          <div><label className="label">Canales para recibir quejas</label><textarea className="input h-20" value={f.canales} onChange={set("canales")} disabled={!editable} /></div>
          <div><label className="label">Medios de difusión</label><textarea className="input h-16" value={f.difusion} onChange={set("difusion")} disabled={!editable} /></div>
        </section>
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-ink">Compromisos incluidos</h2>
          <p className="text-xs text-gray-500">Marcados: recomendados por los resultados. Puede agregar o quitar.</p>
          <div className="mt-3 space-y-1.5">
            {list.map((c) => (
              <label key={c.id} className="flex items-start gap-2 rounded-lg p-1.5 text-sm hover:bg-surface-2">
                <input type="checkbox" className="mt-0.5" checked={sel.includes(c.id)} disabled={!editable} onChange={(e) => setSel((s) => (e.target.checked ? [...s, c.id] : s.filter((x) => x !== c.id)))} />
                <span><span className="text-ink">{c.title}</span>{c.tier && <span className="ml-1 rounded-full bg-brand-50 px-1.5 text-[10px] font-semibold text-brand-700">{c.tier}</span>}<span className="block text-[11px] text-gray-500">NOM-035 · {c.numeral}</span></span>
              </label>
            ))}
          </div>
        </section>
        <div className="flex gap-2">
          <button type="button" className="btn-primary flex-1" onClick={downloadWord}>Descargar Word</button>
          <button type="button" className="btn-secondary flex-1" onClick={() => window.print()}>Imprimir / PDF</button>
        </div>
      </aside>

      <article className="report-paper mx-auto w-full max-w-[216mm] rounded-sm bg-white px-[16mm] py-[16mm] text-[13px] leading-relaxed text-gray-900 shadow-lg print:max-w-none print:p-0 print:shadow-none">
        <div ref={doc}>
          <p className="muted text-[11px] uppercase tracking-widest text-gray-500">{company}{workplace ? ` · ${workplace}` : ""}</p>
          <h1 className="text-[22px] font-bold text-[#0F2A5F]">Política de prevención de riesgos psicosociales</h1>
          <p className="muted text-xs text-gray-500">En cumplimiento de la NOM-035-STPS-2018, Factores de riesgo psicosocial en el trabajo — Identificación, análisis y prevención (numeral 5.1).</p>

          <h2 className="mt-5 text-[15px] font-bold text-[#0F2A5F]">1. Declaración</h2>
          <p className="text-justify"><b>{company}</b> se compromete a prevenir los factores de riesgo psicosocial, prevenir la violencia laboral y promover un entorno organizacional favorable en {workplace ? <>el centro de trabajo <b>{workplace}</b></> : "todos sus centros de trabajo"}, reconociendo que el bienestar de las personas es condición para un trabajo seguro y productivo. Esta política se establece por escrito, se implanta, se mantiene y se difunde a todo el personal.</p>

          <h2 className="mt-4 text-[15px] font-bold text-[#0F2A5F]">2. Objetivo y alcance</h2>
          <p className="text-justify">Establecer los compromisos y responsabilidades para identificar, analizar, prevenir y controlar los factores de riesgo psicosocial, así como atender los actos de violencia laboral. Aplica a todas las personas que laboran en el centro de trabajo, sin importar su puesto, tipo de contratación o turno.</p>

          <h2 className="mt-4 text-[15px] font-bold text-[#0F2A5F]">3. Compromisos</h2>
          <ol className="list-decimal space-y-1.5 pl-5 text-justify">
            <li>Identificar y analizar periódicamente los factores de riesgo psicosocial y evaluar el entorno organizacional con los instrumentos de la norma, y conservar sus registros.</li>
            {chosen.map((c) => <li key={c.id}>{c.text}</li>)}
          </ol>

          <h2 className="mt-4 text-[15px] font-bold text-[#0F2A5F]">4. Prevención de la violencia laboral</h2>
          <p className="text-justify">No se toleran el acoso, el hostigamiento ni los malos tratos en ninguna de sus formas. Toda persona puede presentar una queja de manera confidencial y sin represalias; cada caso se investiga con imparcialidad y se aplican las medidas que correspondan.</p>

          <h2 className="mt-4 text-[15px] font-bold text-[#0F2A5F]">5. Mecanismo de quejas</h2>
          <p className="text-justify">Las quejas por prácticas opuestas al entorno organizacional favorable y por actos de violencia laboral se reciben por: {f.canales}. Se atienden en un plazo máximo de 30 días y se protege la identidad de quien las presenta.</p>

          <h2 className="mt-4 text-[15px] font-bold text-[#0F2A5F]">6. Responsabilidades</h2>
          <ul className="list-disc space-y-1 pl-5 text-justify">
            <li><b>Dirección:</b> aprobar y respaldar esta política y asignar los recursos para su cumplimiento.</li>
            <li><b>{f.resp || "Área responsable"}:</b> coordinar su aplicación, la evaluación periódica, el programa de intervención, los registros y la atención de quejas.</li>
            <li><b>Jefes y supervisores:</b> dirigir con respeto, comunicar con claridad y aplicar las medidas de prevención en sus equipos.</li>
            <li><b>Trabajadores:</b> observar las medidas de prevención, abstenerse de prácticas contrarias al entorno organizacional favorable y de actos de violencia laboral, participar en la identificación de los factores de riesgo y, en su caso, informar sobre acontecimientos traumáticos severos.</li>
          </ul>

          <h2 className="mt-4 text-[15px] font-bold text-[#0F2A5F]">7. Difusión y revisión</h2>
          <p className="text-justify">Esta política, las medidas adoptadas y los posibles daños a la salud por la exposición a los factores de riesgo psicosocial se difunden por: {f.difusion}. La política se revisa al menos una vez al año y después de cada evaluación.</p>

          {result && <p className="muted mt-4 rounded bg-gray-50 p-3 text-xs text-gray-600">Compromisos definidos con base en los resultados de <b>{evaluation}</b>: calificación final {result.mean} (nivel {result.level.toLowerCase()}), {result.hiPct}% del personal en nivel alto o muy alto, {result.n} cuestionarios analizados.</p>}

          <p className="mt-6">{[f.lugar, f.fecha].filter(Boolean).join(", ")}</p>
          <div className="sign mt-14 w-72 border-t border-gray-800 pt-1 text-sm">
            <b>{f.rep || "Nombre y firma"}</b><br />{f.cargo}<br />{company}
          </div>
        </div>
      </article>
    </div>
  );
}
