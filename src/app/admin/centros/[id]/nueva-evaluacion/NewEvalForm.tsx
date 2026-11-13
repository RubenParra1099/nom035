"use client";
import Help from "@/components/ui/Help";
import type { HelpId } from "@/lib/help";
import Link from "next/link";
import { useMemo, useState } from "react";
import { requiredGuide, sampleSize } from "@/lib/nom035/score";
import ChipsInput from "@/components/ui/ChipsInput";
import { SaveButton } from "@/components/ui/forms";

type Row = { key: number; name: string; count: string };
const GUIDES = [
  { id: "GUIA_II", name: "Guía II · 46 reactivos", desc: "Centros de 16 a 50 trabajadores. Factores de riesgo psicosocial; se aplica a todo el personal." },
  { id: "GUIA_III", name: "Guía III · 72 reactivos", desc: "Centros de más de 50 trabajadores. Agrega la evaluación del entorno organizacional; se aplica a una muestra." },
] as const;

function Step({ n, t, d, h }: { n: number; t: string; d?: string; h?: HelpId }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">{n}</span>
      <div><h2 className="flex items-center gap-1.5 text-base font-semibold text-ink">{t}{h && <Help id={h} />}</h2>{d && <p className="text-xs text-gray-500">{d}</p>}</div>
    </div>
  );
}

export default function NewEvalForm({ action, workplaceId, back, defaultName, headcount, areas, suggestions, positions, positionSuggestions, source }: {
  action: (f: FormData) => Promise<void>;
  workplaceId: string; back: string; defaultName: string; headcount: number;
  areas: { name: string; headcount: number | null }[]; suggestions: string[];
  positions: string[]; positionSuggestions: string[]; source: string | null;
}) {
  const [total, setTotal] = useState(headcount ? String(headcount) : "");
  const [rows, setRows] = useState<Row[]>(() => {
    const r = areas.map((a, i) => ({ key: i, name: a.name, count: a.headcount == null ? "" : String(a.headcount) }));
    return r.length ? r : [{ key: 0, name: "", count: "" }];
  });
  const [nextKey, setNextKey] = useState(rows.length);
  const [picked, setPicked] = useState<string | null>(null);

  const N = Math.max(0, parseInt(total || "0", 10) || 0);
  const rec = requiredGuide(N) ?? "GUIA_II";
  const guide = picked ?? rec;
  const target = guide === "GUIA_III" && N > 50 ? sampleSize(N) : N;
  const named = rows.filter((r) => r.name.trim());
  const sum = named.reduce((a, r) => a + (parseInt(r.count || "0", 10) || 0), 0);
  const withCount = named.filter((r) => r.count !== "").length;
  const dupes = useMemo(() => {
    const seen = new Set<string>(), d = new Set<string>();
    for (const r of named) { const k = r.name.trim().toLowerCase(); if (seen.has(k)) d.add(k); seen.add(k); }
    return d;
  }, [named]);
  const missing = suggestions.filter((s) => !named.some((r) => r.name.trim().toLowerCase() === s.toLowerCase()));

  const set = (key: number, patch: Partial<Row>) => setRows((cur) => cur.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const add = (names: string[] = [""]) => {
    setRows((cur) => [...cur.filter((r) => r.name.trim() || r.count), ...names.map((name, i) => ({ key: nextKey + i, name, count: "" }))]);
    setNextKey((k) => k + names.length);
  };

  const status = !withCount ? null
    : !N ? { tone: "amber", text: "Capture el total de trabajadores del centro." }
    : sum === N && withCount === named.length ? { tone: "green", text: "La plantilla por área coincide con el total del centro." }
    : withCount < named.length ? { tone: "amber", text: `Faltan ${named.length - withCount} áreas sin número de trabajadores.` }
    : { tone: "amber", text: sum < N ? `Faltan ${N - sum} trabajadores por asignar a un área.` : `Las áreas suman ${sum - N} trabajadores más que el total.` };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <form action={action} className="card space-y-7 p-6">
        <input type="hidden" name="workplaceId" value={workplaceId} />
        <input type="hidden" name="departments" value={named.map((r) => r.name.trim()).join("\n")} />
        <input type="hidden" name="areaHeadcount" value={JSON.stringify(Object.fromEntries(named.filter((r) => r.count !== "").map((r) => [r.name.trim(), parseInt(r.count, 10) || 0])))} />

        <div className="space-y-3">
          <Step n={1} t="Datos de la evaluación" h="ne.datos" />
          <div className="pl-9">
            <label className="label" htmlFor="name">Nombre</label>
            <input id="name" name="name" className="input max-w-md" required minLength={2} defaultValue={defaultName} />
          </div>
        </div>

        <div className="space-y-3">
          <Step n={2} h="ne.plantilla" t="Plantilla del centro" d="Trabajadores por área al momento de esta evaluación. Las áreas son las opciones de “Departamento / área” del cuestionario y los filtros del tablero." />
          <div className="space-y-3 pl-9">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="label" htmlFor="headcount">Total de trabajadores del centro</label>
                <input id="headcount" name="headcount" type="number" min={1} required className="input w-40 text-right" value={total} onChange={(e) => setTotal(e.target.value)} />
              </div>
              <div className="pb-2 text-sm text-gray-500">Suma de áreas: <b className={status?.tone === "green" ? "text-green-700" : "text-ink"}>{sum}</b>{N > 0 && <> / {N}</>}</div>
            </div>

            <div className="overflow-hidden rounded-xl border border-line">
              <div className="grid grid-cols-[minmax(0,1fr)_5.5rem_2rem] sm:grid-cols-[minmax(0,1fr)_8rem_2.5rem] gap-2 bg-surface-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <span>Área</span><span className="text-right">Trabajadores</span><span />
              </div>
              {rows.map((r) => {
                const dup = r.name.trim() && dupes.has(r.name.trim().toLowerCase());
                return (
                  <div key={r.key} className="grid grid-cols-[minmax(0,1fr)_5.5rem_2rem] sm:grid-cols-[minmax(0,1fr)_8rem_2.5rem] items-center gap-2 border-t border-line px-3 py-2">
                    <input aria-label="Nombre del área" className={`input ${dup ? "border-red-400" : ""}`} placeholder="Ej. Producción" value={r.name}
                      onChange={(e) => set(r.key, { name: e.target.value })}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
                    <input aria-label={`Trabajadores de ${r.name || "el área"}`} type="number" min={0} className="input text-right" placeholder="—" value={r.count}
                      onChange={(e) => set(r.key, { count: e.target.value })}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
                    <button type="button" aria-label={`Quitar ${r.name || "área"}`} className="grid h-9 w-8 place-items-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                      onClick={() => setRows((cur) => (cur.length > 1 ? cur.filter((x) => x.key !== r.key) : [{ key: r.key, name: "", count: "" }]))}>×</button>
                  </div>
                );
              })}
              <div className="flex flex-wrap items-center gap-3 border-t border-line bg-surface-2/50 px-3 py-2 text-sm">
                <button type="button" className="font-medium text-brand-700 hover:underline" onClick={() => add()}>+ Agregar área</button>
                {missing.length > 0 && <span className="text-xs text-gray-500">De la evaluación anterior: {missing.map((m) => (
                  <button key={m} type="button" className="ml-1 rounded-full bg-brand-50 px-2 py-0.5 text-brand-700 hover:bg-brand-100" onClick={() => add([m])}>+ {m}</button>
                ))}</span>}
              </div>
            </div>
            {status && <p className={`text-xs ${status.tone === "green" ? "text-green-700" : "text-amber-700"}`}>{status.tone === "green" ? "✓ " : "⚠ "}{status.text}
              {status.tone !== "green" && withCount === named.length && sum > 0 && sum !== N && <> <button type="button" className="font-semibold text-brand-700 hover:underline" onClick={() => setTotal(String(sum))}>Usar {sum} como total</button></>}</p>}
            {dupes.size > 0 && <p className="text-xs text-red-600">Hay áreas repetidas; se guardará solo una.</p>}
            <p className="text-xs text-gray-500">El número por área es opcional, pero permite medir participación y representatividad por área y la cobertura de capacitación. Al crear la evaluación se actualiza la plantilla del centro y queda guardada con esta evaluación.</p>
          </div>
        </div>

        <div className="space-y-3">
          <Step n={3} h="ne.cuestionario" t="Cuestionario" d="Se sugiere según el total de trabajadores del centro" />
          <div className="grid gap-3 pl-9 md:grid-cols-2">
            {GUIDES.map((g) => (
              <label key={g.id} className="relative flex cursor-pointer gap-3 rounded-xl border border-line p-4 transition has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
                <input type="radio" name="guide" value={g.id} checked={guide === g.id} onChange={() => setPicked(g.id)} className="mt-1" />
                <span>
                  <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">{g.name}{g.id === rec && N > 0 && <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">Recomendada</span>}</span>
                  <span className="mt-1 block text-xs text-gray-600">{g.desc}</span>
                </span>
              </label>
            ))}
            <label className="flex items-start gap-3 rounded-xl bg-surface-2 p-4 md:col-span-2">
              <input type="checkbox" name="includeGuideI" defaultChecked className="mt-1" />
              <span><span className="block text-sm font-semibold text-ink">Incluir Guía I · acontecimientos traumáticos severos</span>
                <span className="block text-xs text-gray-600">Obligatoria en todos los centros. Identifica a quien requiere valoración clínica y crea su caso en Seguimiento Guía I.</span></span>
            </label>
          </div>
        </div>

        <div className="space-y-3">
          <Step n={4} h="ne.puestos" t="Tipos de puesto" d="Opciones de “Tipo de puesto” en el cuestionario" />
          <div className="pl-9">
            <ChipsInput name="positions" initial={positions} suggestions={positionSuggestions} placeholder="Ej. Operativo, Supervisor" suggestLabel="Puestos estándar sin agregar:" />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-line pt-5">
          <Link href={back} className="btn-secondary">Cancelar</Link>
          <SaveButton done="Evaluación creada ✓">Crear evaluación</SaveButton>
        </div>
      </form>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <div className="card p-5">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">Resumen<Help id="ne.resumen" /></h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">Trabajadores</dt><dd className="font-semibold text-ink">{N || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Áreas</dt><dd className="font-semibold text-ink">{named.length}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Cuestionario</dt><dd className="font-semibold text-ink">{guide === "GUIA_III" ? "Guía III" : "Guía II"}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Meta de cuestionarios</dt><dd className="font-semibold text-brand-700">{target || "—"}</dd></div>
          </dl>
        </div>
        {N > 0 && <div className="rounded-xl bg-brand-50 p-4 text-sm text-brand-900">
          {N > 50
            ? guide === "GUIA_III" ? <>Con {N} trabajadores se requieren al menos <b>{sampleSize(N)}</b> cuestionarios de Guía III (muestra representativa).</> : <>Con {N} trabajadores la norma pide la <b>Guía III</b>.</>
            : N > 15
              ? <>Con {N} trabajadores, la Guía II se aplica a todo el personal: <b>{N}</b> cuestionarios.</>
              : <>Con {N} trabajadores la norma solo exige la Guía I y la política de prevención; la Guía II es opcional.</>}
        </div>}
        {source && <p className="px-1 text-xs text-gray-500">{source}</p>}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-ink">Qué sigue</h2>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-gray-600">
            <li>Abra la evaluación y comparta el enlace o el código QR.</li>
            <li>O importe respuestas desde Excel con la plantilla.</li>
            <li>Revise el avance contra la meta y la participación por área.</li>
            <li>Analice los resultados en el tablero.</li>
          </ol>
        </div>
      </aside>
    </div>
  );
}
