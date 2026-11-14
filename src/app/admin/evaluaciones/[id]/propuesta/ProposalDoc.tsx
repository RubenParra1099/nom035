"use client";
import { useRef, useState } from "react";
import Help from "@/components/ui/Help";
import { LogoMark } from "@/components/Logo";

export type ProposalData = {
  company: string; workplace: string; evaluation: string; guide: string; headcount: number; n: number;
  final: { mean: number; level: string; prev: number | null; prevName: string | null };
  hiPct: number; ats: number; redKpis: number;
  domains: { name: string; category: string; level: string; mean: number; hiPct: number; delta: number | null }[];
  targets: { label: string; now: string; target: string; light: string }[];
  recs: { id: string; title: string; tier: string; type: string; level: number; numeral: string; horizon: string; effort: string; purpose: string; actions: string[]; areas: string[]; domain: string | null }[];
};
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const today = () => { const d = new Date(); return `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`; };
const NIVEL = ["", "1º organizacional", "2º grupal", "3º individual"];
const PHASES = [
  { h: "0–3 meses", t: "Fase 1 · Primeros 90 días", d: "Cumplimiento y atención inmediata" },
  { h: "3–6 meses", t: "Fase 2 · Meses 4 a 6", d: "Intervención en los dominios prioritarios" },
  { h: "6–12 meses", t: "Fase 3 · Meses 7 a 12", d: "Consolidación y nueva evaluación" },
];
const TIER_COLOR: Record<string, string> = { "Obligatoria": "#1D4ED8", "Prioridad alta": "#DC2626", "Prioridad media": "#D97706", "Preventiva": "#6B7280" };

/** Propuesta ejecutiva de mejora para la dirección del cliente: diagnóstico, políticas, plan por fases y metas. */
export default function ProposalDoc({ data: d, consultant, editable }: { data: ProposalData; consultant: string; editable: boolean }) {
  const [sel, setSel] = useState<string[]>(d.recs.filter((r) => r.tier !== "Preventiva").map((r) => r.id));
  const [f, setF] = useState({ consultor: consultant, cargo: "Consultor(a) NOM-035", fecha: today(), dirigido: "", inversion: "", notas: "" });
  const doc = useRef<HTMLDivElement>(null);
  const chosen = d.recs.filter((r) => sel.includes(r.id));
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const change = d.final.prev != null ? d.final.mean - d.final.prev : null;

  function downloadWord() {
    if (!doc.current) return;
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>Propuesta de mejora</title>
      <style>body{font-family:Arial,sans-serif;font-size:10.5pt;line-height:1.4;color:#111}h1{font-size:20pt;color:#0F2A5F;margin:0 0 4pt}h2{font-size:13pt;color:#0F2A5F;margin:14pt 0 6pt;border-bottom:1px solid #ccc}
      h3{font-size:11pt;margin:8pt 0 3pt}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:4pt;font-size:9.5pt;vertical-align:top}th{background:#0F2A5F;color:#fff;text-align:left}
      .kpi td{text-align:center;font-size:10pt}.muted{color:#555;font-size:9pt}p,li{margin:0 0 4pt}</style></head><body>${doc.current.innerHTML}</body></html>`;
    const url = URL.createObjectURL(new Blob(["﻿", html], { type: "application/msword" }));
    const a = document.createElement("a"); a.href = url; a.download = `Propuesta_mejora_${d.company.replace(/[^A-Za-z0-9]+/g, "_")}.doc`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const th = "border border-gray-300 bg-[#0F2A5F] px-2 py-1.5 text-left text-[11px] font-semibold text-white";
  const td = "border border-gray-300 px-2 py-1.5 align-top text-[12px]";
  return (
    <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="space-y-4 print:hidden lg:sticky lg:top-6 lg:self-start">
        <section className="card space-y-3 p-5">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">Datos de la propuesta<Help id="propuesta" /></h2>
          {([["dirigido", "Dirigida a (nombre y cargo)"], ["consultor", "Elaborada por"], ["cargo", "Cargo"], ["fecha", "Fecha"], ["inversion", "Inversión estimada (opcional)"]] as const).map(([k, l]) => (
            <div key={k}><label className="label">{l}</label><input className="input" value={f[k]} onChange={set(k)} disabled={!editable} /></div>
          ))}
          <div><label className="label">Comentarios del consultor</label><textarea className="input h-24" value={f.notas} onChange={set("notas")} disabled={!editable} placeholder="Contexto, alcance del servicio, condiciones…" /></div>
        </section>
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-ink">Políticas incluidas</h2>
          <p className="text-xs text-gray-500">Vienen marcadas las obligatorias y las de prioridad alta y media.</p>
          <div className="mt-2 space-y-1">
            {d.recs.map((r) => (
              <label key={r.id} className="flex items-start gap-2 rounded-lg p-1.5 text-sm hover:bg-surface-2">
                <input type="checkbox" className="mt-0.5" checked={sel.includes(r.id)} disabled={!editable} onChange={(e) => setSel((s) => (e.target.checked ? [...s, r.id] : s.filter((x) => x !== r.id)))} />
                <span><span className="text-ink">{r.title}</span><span className="block text-[11px]" style={{ color: TIER_COLOR[r.tier] }}>{r.tier}</span></span>
              </label>
            ))}
          </div>
        </section>
        <div className="flex gap-2">
          <button type="button" className="btn-primary flex-1" onClick={downloadWord}>Descargar Word</button>
          <button type="button" className="btn-secondary flex-1" onClick={() => window.print()}>Imprimir / PDF</button>
        </div>
      </aside>

      <article className="report-paper mx-auto w-full max-w-[216mm] rounded-sm bg-white px-[15mm] py-[15mm] text-[13px] leading-relaxed text-gray-900 shadow-lg print:max-w-none print:p-0 print:shadow-none">
        <div ref={doc}>
          <div className="mb-2 flex items-center gap-2"><LogoMark size={30} /><p className="text-[11px] uppercase tracking-widest text-gray-500">Propuesta de mejora · NOM-035-STPS-2018</p></div>
          <h1 className="text-[24px] font-bold leading-tight text-[#0F2A5F]">{d.company}</h1>
          <p className="text-sm text-gray-600">{d.workplace} · {d.evaluation} · {d.guide}</p>
          <p className="mt-1 text-xs text-gray-500">{[f.dirigido && `Dirigida a: ${f.dirigido}`, f.fecha].filter(Boolean).join(" · ")}</p>

          <h2 className="mt-5 border-b border-gray-300 pb-1 text-[16px] font-bold text-[#0F2A5F]">1. Diagnóstico</h2>
          <table className="kpi mt-2 w-full border-collapse text-center">
            <tbody><tr>
              {[["Calificación final", `${d.final.mean}`, d.final.level], ["Alto o muy alto", `${d.hiPct}%`, "del personal"], ["Cuestionarios", `${d.n}`, `de ${d.headcount} trabajadores`], ["Guía I", `${d.ats}`, "requieren valoración"], ["KPIs en rojo", `${d.redKpis}`, "de 27"]].map(([l, v, s]) => (
                <td key={l} className="w-1/5 border border-gray-300 p-2"><div className="text-[10px] uppercase tracking-wide text-gray-500">{l}</div><div className="text-[20px] font-bold text-[#0F2A5F]">{v}</div><div className="text-[10px] text-gray-500">{s}</div></td>
              ))}
            </tr></tbody>
          </table>
          <p className="mt-3 text-justify">
            El centro obtuvo una calificación final de <b>{d.final.mean} (nivel {d.final.level.toLowerCase()})</b>{change != null && d.final.prevName ? <>, {change < 0 ? "una mejora" : "un aumento del riesgo"} de {Math.abs(change).toFixed(1)} puntos frente a {d.final.prevName}</> : null}. El <b>{d.hiPct}%</b> del personal se encuentra en nivel alto o muy alto.
            {d.domains.length ? <> Los dominios que requieren intervención son: {d.domains.slice(0, 4).map((x, i) => <span key={x.name}>{i ? ", " : ""}<b>{x.name}</b> ({x.level.toLowerCase()}, {x.hiPct}% en alto o muy alto)</span>)}.</> : " Ningún dominio alcanza el nivel medio."}
            {d.ats > 0 && <> Además, <b>{d.ats}</b> {d.ats === 1 ? "trabajador requiere" : "trabajadores requieren"} valoración clínica por acontecimientos traumáticos severos (Guía I), lo que exige canalización inmediata.</>}
          </p>
          {d.domains.length > 0 && (
            <table className="mt-2 w-full border-collapse">
              <thead><tr><th className={th}>Dominio</th><th className={th}>Categoría</th><th className={th}>Nivel</th><th className={th}>Alto o muy alto</th><th className={th}>Cambio</th></tr></thead>
              <tbody>{d.domains.map((x) => <tr key={x.name}><td className={td}>{x.name}</td><td className={td}>{x.category}</td><td className={td}>{x.level} · {x.mean}</td><td className={td}>{x.hiPct}%</td><td className={td}>{x.delta == null ? "—" : `${x.delta > 0 ? "+" : ""}${x.delta} pts`}</td></tr>)}</tbody>
            </table>
          )}

          <h2 className="mt-5 border-b border-gray-300 pb-1 text-[16px] font-bold text-[#0F2A5F]">2. Políticas recomendadas</h2>
          <table className="mt-2 w-full border-collapse">
            <thead><tr><th className={th}>Prioridad</th><th className={th}>Política</th><th className={th}>Nivel (8.5)</th><th className={th}>NOM-035</th><th className={th}>Áreas foco</th></tr></thead>
            <tbody>{chosen.map((r) => (
              <tr key={r.id}><td className={td}><b style={{ color: TIER_COLOR[r.tier] }}>{r.tier}</b></td><td className={td}><b>{r.title}</b><br /><span className="text-gray-600">{r.purpose}</span></td>
                <td className={td}>{NIVEL[r.level]}</td><td className={td}>{r.numeral}</td><td className={td}>{r.areas.join(", ") || "Todo el centro"}</td></tr>
            ))}</tbody>
          </table>

          <h2 className="mt-5 border-b border-gray-300 pb-1 text-[16px] font-bold text-[#0F2A5F]">3. Plan de trabajo</h2>
          {PHASES.map((p) => {
            const rs = chosen.filter((r) => r.horizon === p.h);
            if (!rs.length) return null;
            return (
              <div key={p.h} className="mt-2">
                <h3 className="text-[13px] font-bold text-gray-900">{p.t} <span className="font-normal text-gray-500">· {p.d}</span></h3>
                <ul className="list-disc space-y-0.5 pl-5">{rs.map((r) => <li key={r.id}><b>{r.title}:</b> {r.actions.join(" ")}</li>)}</ul>
              </div>
            );
          })}
          <p className="mt-2 text-xs text-gray-500">Cada acción se registra en el Programa de intervención de la plataforma con responsable, fecha compromiso y control de avance (numeral 8.4).</p>

          <h2 className="mt-5 border-b border-gray-300 pb-1 text-[16px] font-bold text-[#0F2A5F]">4. Metas para la siguiente evaluación</h2>
          <table className="mt-2 w-full border-collapse">
            <thead><tr><th className={th}>Indicador</th><th className={th}>Hoy</th><th className={th}>Meta</th></tr></thead>
            <tbody>{d.targets.map((t) => <tr key={t.label}><td className={td}>{t.label}</td><td className={td}><b style={{ color: t.light === "ROJO" ? "#DC2626" : t.light === "AMARILLO" ? "#B45309" : "#15803D" }}>{t.now}</b></td><td className={td}><b>{t.target}</b></td></tr>)}</tbody>
          </table>
          <p className="mt-1 text-xs text-gray-500">Las metas se miden con la plataforma al repetir la evaluación; el cambio se reporta con su margen de error para distinguir mejoras reales.</p>

          {(f.inversion || f.notas) && <>
            <h2 className="mt-5 border-b border-gray-300 pb-1 text-[16px] font-bold text-[#0F2A5F]">5. Alcance e inversión</h2>
            {f.notas && <p className="whitespace-pre-line text-justify">{f.notas}</p>}
            {f.inversion && <p><b>Inversión estimada:</b> {f.inversion}</p>}
          </>}

          <div className="mt-10 text-sm">
            <div className="w-72 border-t border-gray-800 pt-1"><b>{f.consultor || "Nombre"}</b><br />{f.cargo}</div>
          </div>
        </div>
      </article>
    </div>
  );
}
