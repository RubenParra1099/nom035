"use client";
import Help from "@/components/ui/Help";
import type { HelpId } from "@/lib/help";
import Link from "next/link";
import { useState } from "react";
import { requiredGuide, sampleSize } from "@/lib/nom035/score";
import ChipsInput from "@/components/ui/ChipsInput";
import { SaveButton } from "@/components/ui/forms";

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

/** Nueva evaluación: la plantilla (total y áreas) viene de la Estructura de la empresa; aquí solo se confirma. */
export default function NewEvalForm({ action, workplaceId, back, estructura, defaultName, headcount, areas, fallbackAreas, positions, positionSuggestions, source }: {
  action: (f: FormData) => Promise<void>;
  workplaceId: string; back: string; estructura: string; defaultName: string; headcount: number;
  areas: { name: string; headcount: number }[]; fallbackAreas: string[];
  positions: string[]; positionSuggestions: string[]; source: string | null;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const N = headcount;
  const rec = requiredGuide(N) ?? "GUIA_II";
  const guide = picked ?? rec;
  const target = guide === "GUIA_III" && N > 50 ? sampleSize(N) : N;
  const sum = areas.reduce((t, a) => t + a.headcount, 0);
  const mx = Math.max(1, ...areas.map((a) => a.headcount));
  const ok = areas.length > 0 && sum === N;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <form action={action} className="card space-y-7 p-6">
        <input type="hidden" name="workplaceId" value={workplaceId} />
        {!areas.length && <input type="hidden" name="departments" value={fallbackAreas.join("\n")} />}

        <div className="space-y-3">
          <Step n={1} t="Datos de la evaluación" h="ne.datos" />
          <div className="pl-9">
            <label className="label" htmlFor="name">Nombre</label>
            <input id="name" name="name" className="input max-w-md" required minLength={2} defaultValue={defaultName} />
          </div>
        </div>

        <div className="space-y-3">
          <Step n={2} h="ne.plantilla" t="Plantilla del centro" d="Se toma de la Estructura de la empresa y queda guardada con esta evaluación." />
          <div className="space-y-3 pl-9">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl bg-surface-2 px-4 py-3">
              <div><div className="text-xs text-gray-500">Trabajadores</div><div className="text-xl font-semibold tabular-nums text-ink">{N}</div></div>
              <div><div className="text-xs text-gray-500">Áreas</div><div className="text-xl font-semibold tabular-nums text-ink">{areas.length}</div></div>
              <div><div className="text-xs text-gray-500">Suma de áreas</div><div className={`text-xl font-semibold tabular-nums ${ok ? "text-green-700" : "text-amber-600"}`}>{areas.length ? `${sum} ${ok ? "✓" : "⚠"}` : "—"}</div></div>
              <Link href={estructura} className="btn-secondary ml-auto">✎ Editar en Estructura</Link>
            </div>
            {areas.length > 0 ? (
              <div className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                {areas.map((a) => (
                  <div key={a.name} className="flex items-center gap-3 py-1">
                    <span className="w-36 truncate text-gray-700" title={a.name}>{a.name}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full rounded-full bg-brand-600/40" style={{ width: `${(a.headcount / mx) * 100}%` }} /></span>
                    <span className="w-9 text-right font-semibold tabular-nums text-ink">{a.headcount}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30">
                Este centro no tiene áreas en la Estructura.{fallbackAreas.length ? ` Se usarán las de la evaluación anterior (${fallbackAreas.join(", ")}), sin número de trabajadores.` : " El cuestionario no pedirá área."} Para medir participación por área, <Link href={estructura} className="font-semibold underline">captúrelas en la Estructura</Link>.
              </p>
            )}
            {areas.length > 0 && !ok && <p className="text-xs text-amber-700">⚠ {sum < N ? `Faltan ${N - sum} trabajadores por asignar a un área.` : `Las áreas suman ${sum - N} más que el total.`} Puede crear la evaluación así o corregirlo en la Estructura.</p>}
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
            <div className="flex justify-between"><dt className="text-gray-500">Áreas</dt><dd className="font-semibold text-ink">{areas.length || fallbackAreas.length}</dd></div>
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
