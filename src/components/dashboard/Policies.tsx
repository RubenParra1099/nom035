"use client";
import { useMemo, useState } from "react";
import Help from "@/components/ui/Help";
import { Drawer, SaveButton, toast } from "@/components/ui/forms";
import { addPolicyActions } from "@/app/admin/gestion-actions";
import { LEVEL_LABEL } from "@/lib/nom035/guides";
import type { Recommendation } from "@/lib/nom035/policies";

const TIER_STYLE: Record<Recommendation["tier"], string> = {
  "Obligatoria": "bg-brand-600 text-white",
  "Prioridad alta": "bg-red-600 text-white",
  "Prioridad media": "bg-amber-400 text-gray-900",
  "Preventiva": "bg-gray-200 text-gray-700",
};
const LIGHT: Record<string, string> = { ROJO: "bg-red-100 text-red-700", AMARILLO: "bg-amber-100 text-amber-800", VERDE: "bg-green-100 text-green-700", SIN_DATOS: "bg-gray-100 text-gray-600" };
const NIVEL = ["", "1er nivel · organizacional", "2º nivel · grupal", "3er nivel · individual"];
const MONTHS: Record<string, number> = { "0–3 meses": 3, "3–6 meses": 6, "6–12 meses": 12 };
const due = (h: string) => { const d = new Date(); d.setMonth(d.getMonth() + (MONTHS[h] ?? 3)); return d.toISOString().slice(0, 10); };

function AddToProgram({ r, evaluationId }: { r: Recommendation; evaluationId: string }) {
  const [sel, setSel] = useState<string[]>(r.policy.actions);
  return (
    <Drawer trigger="+ Agregar al programa" triggerClass="btn-primary px-3 py-1.5 text-sm" title="Agregar al programa de intervención" subtitle={r.policy.title}>
      <form action={addPolicyActions} className="space-y-4">
        <input type="hidden" name="evaluationId" value={evaluationId} />
        <input type="hidden" name="domain" value={r.domain?.name ?? r.policy.title} />
        <fieldset className="space-y-2">
          <legend className="label">Acciones a registrar</legend>
          {r.policy.actions.map((a) => (
            <label key={a} className="flex items-start gap-2 rounded-lg border border-line p-2.5 text-sm">
              <input type="checkbox" name="action" value={a} checked={sel.includes(a)} onChange={(e) => setSel((s) => (e.target.checked ? [...s, a] : s.filter((x) => x !== a)))} className="mt-0.5" />
              <span>{a}</span>
            </label>
          ))}
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label">Área</label><input name="area" className="input" defaultValue={r.areas[0]?.name ?? "Todo el centro"} /></div>
          <div><label className="label">Responsable</label><input name="owner" className="input" placeholder="Ej. RH, Gerente de planta" /></div>
          <div><label className="label">Fecha compromiso</label><input type="date" name="dueDate" className="input" defaultValue={due(r.policy.horizon)} required /></div>
        </div>
        <div className="flex justify-end border-t border-line pt-4"><SaveButton done="Acciones agregadas ✓">{`Agregar ${sel.length} ${sel.length === 1 ? "acción" : "acciones"}`}</SaveButton></div>
      </form>
    </Drawer>
  );
}

export default function Policies({ recs, evaluationId, canEdit, evaluationName }: { recs: Recommendation[]; evaluationId: string; canEdit: boolean; evaluationName: string }) {
  const [tier, setTier] = useState<string>("");
  const [nivel, setNivel] = useState<number>(0);
  const shown = recs.filter((r) => (!tier || r.tier === tier) && (!nivel || r.policy.level === nivel));
  const counts = useMemo(() => Object.fromEntries((Object.keys(TIER_STYLE) as Recommendation["tier"][]).map((t) => [t, recs.filter((r) => r.tier === t).length])), [recs]);

  function exportCsv() {
    const rows = [["Prioridad", "Política", "Tipo", "Nivel de intervención", "Numeral NOM-035", "Dominio", "Nivel del dominio", "% alto o muy alto", "Áreas más afectadas", "Por qué", "Acciones", "Indicador y meta", "Horizonte", "Esfuerzo", "Compromiso para la política"]];
    recs.forEach((r) => rows.push([r.tier, r.policy.title, r.policy.type, NIVEL[r.policy.level], r.policy.numeral, r.domain?.name ?? "", r.domain ? LEVEL_LABEL[r.domain.level] : "",
      r.domain ? `${Math.round(r.domain.hiPct)}%` : "", r.areas.map((a) => `${a.name} ${Math.round(a.hiPct)}%`).join("; "), r.evidence.join(" "), r.policy.actions.join(" | "),
      r.kpis.map((k) => `${k.short} ${k.display}${k.target ? ` → ${k.target}` : ""}`).join("; "), r.policy.horizon, r.policy.effort, r.policy.commitment]));
    const csv = "﻿" + rows.map((x) => x.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `Politicas_de_mejora_${evaluationName.replace(/\s+/g, "_")}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="space-y-4">
      <section className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-1.5 text-base font-semibold text-ink">Políticas de mejora recomendadas<Help id="pol" /></h2>
            <p className="text-xs text-gray-500">Generadas a partir de los resultados filtrados, alineadas a los numerales 5, 8.1, 8.2 y 8.5 de la NOM-035. Adapte cada una al centro antes de proponerla.</p>
          </div>
          <button type="button" className="btn-secondary print:hidden" onClick={exportCsv}>Exportar a Excel</button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {(Object.keys(TIER_STYLE) as Recommendation["tier"][]).map((t) => (
            <button key={t} type="button" onClick={() => setTier(tier === t ? "" : t)} className={`rounded-xl border p-3 text-left transition ${tier === t ? "border-brand-600 ring-2 ring-brand-600/30" : "border-line hover:border-gray-400"}`}>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${TIER_STYLE[t]}`}>{t}</span>
              <div className="mt-1 text-2xl font-semibold tabular-nums text-ink">{counts[t]}</div>
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-sm">
          <span className="text-xs text-gray-500">Nivel de intervención (8.5):</span>
          {[0, 1, 2, 3].map((l) => (
            <button key={l} type="button" onClick={() => setNivel(l)} className={`rounded-full border px-3 py-1 ${nivel === l ? "border-brand-600 bg-brand-50 font-semibold text-brand-700" : "border-line text-gray-600"}`}>{l ? NIVEL[l] : "Todos"}</button>
          ))}
        </div>
      </section>

      {shown.length === 0 && <div className="card p-8 text-center text-sm text-gray-500">No hay políticas con estos filtros.</div>}
      <div className="grid gap-4 xl:grid-cols-2">
        {shown.map((r) => (
          <article key={r.policy.id} className="card flex flex-col p-5">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
              <span className={`rounded-full px-2 py-0.5 ${TIER_STYLE[r.tier]}`}>{r.tier}</span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">{r.policy.type}</span>
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">{NIVEL[r.policy.level]}</span>
              <span className="ml-auto text-gray-500">NOM-035 · {r.policy.numeral}</span>
            </div>
            <h3 className="mt-2 text-base font-semibold text-ink">{r.policy.title}</h3>
            <p className="text-sm text-gray-600">{r.policy.purpose}</p>

            <div className="mt-3 rounded-lg bg-surface-2 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Por qué se recomienda</div>
              <ul className="mt-1 space-y-1 text-sm text-gray-700">{r.evidence.map((e) => <li key={e} className="flex gap-2"><span className="text-brand-600">•</span><span>{e}</span></li>)}</ul>
              {r.areas.length > 0 && (
                <div className="mt-2 space-y-1">
                  {r.areas.map((a) => (
                    <div key={a.name} className="flex items-center gap-2 text-xs">
                      <span className="w-32 truncate text-gray-600">{a.name}</span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200"><span className="block h-full rounded-full bg-red-500" style={{ width: `${Math.min(100, a.hiPct)}%` }} /></span>
                      <span className="w-20 text-right tabular-nums text-gray-600">{Math.round(a.hiPct)}% · n={a.n}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Acciones</div>
              <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-sm text-gray-700">{r.policy.actions.map((a) => <li key={a}>{a}</li>)}</ol>
            </div>

            {r.kpis.length > 0 && (
              <div className="mt-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Indicador y meta sugerida</div>
                <div className="mt-1 space-y-1">{r.kpis.map((k) => (
                  <div key={k.id} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${LIGHT[k.light]}`}>{k.short} {k.display}</span>
                    <span className="text-gray-600">{k.name}</span>
                    {k.target && <span className="font-medium text-ink">→ {k.target}</span>}
                  </div>
                ))}</div>
              </div>
            )}

            <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line pt-3 text-xs text-gray-500">
              <span>⏱ {r.policy.horizon}</span><span>· Esfuerzo {r.policy.effort.toLowerCase()}</span>
              <span className="ml-auto flex gap-2 print:hidden">
                <Drawer trigger="Texto para la política" triggerClass="btn-secondary px-3 py-1.5 text-sm" title="Compromiso para la política de prevención" subtitle={r.policy.title}>
                  <div className="space-y-3">
                    <p className="rounded-lg bg-surface-2 p-4 text-sm leading-relaxed text-ink">{r.policy.commitment}</p>
                    <button type="button" className="btn-secondary" onClick={() => { navigator.clipboard?.writeText(r.policy.commitment); toast("Texto copiado"); }}>Copiar texto</button>
                    <p className="text-xs text-gray-500">Este compromiso se incluirá en el borrador de la política de prevención (numeral 5.1) que genera la plataforma.</p>
                  </div>
                </Drawer>
                {canEdit && <AddToProgram r={r} evaluationId={evaluationId} />}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
