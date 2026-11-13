import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { canSeeCompany, requireUser } from "@/lib/auth";
import { requiredGuide, sampleSize } from "@/lib/nom035/score";
import { createEvaluation } from "../../../actions";
import ChipsInput from "./ChipsInput";

export const dynamic = "force-dynamic";
const POSITIONS = ["Operativo", "Profesional o Técnico", "Auxiliar / Asistente", "Supervisor", "Coordinador", "Gerente"];
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export default async function NewEvaluationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireUser(["SUPERADMIN", "CONSULTOR"]);
  const w = await db.query.workplaces.findFirst({ where: eq(schema.workplaces.id, id), with: { company: true, evaluations: true } });
  if (!w || !canSeeCompany(s, w.companyId)) notFound();
  const areas = (await db.query.workplaceAreas.findMany({ where: eq(schema.workplaceAreas.workplaceId, id) })).map((a) => a.name);
  const last = [...w.evaluations].sort((a, b) => +b.createdAt - +a.createdAt)[0];
  const rec = requiredGuide(w.headcount) ?? "GUIA_II";
  const now = new Date();
  const back = `/admin/empresas/${w.companyId}?centro=${w.id}`;
  const target = w.headcount > 50 ? sampleSize(w.headcount) : w.headcount;

  const guides = [
    { id: "GUIA_II", name: "Guía II · 46 reactivos", desc: "Centros de 16 a 50 trabajadores. Factores de riesgo psicosocial; se aplica a todo el personal." },
    { id: "GUIA_III", name: "Guía III · 72 reactivos", desc: "Centros de más de 50 trabajadores. Agrega la evaluación del entorno organizacional; se aplica a una muestra." },
  ] as const;
  const step = (n: number, t: string, d?: string) => (
    <div className="flex items-baseline gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">{n}</span>
      <div><h2 className="text-base font-semibold text-ink">{t}</h2>{d && <p className="text-xs text-gray-500">{d}</p>}</div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <nav aria-label="Ruta" className="text-sm text-gray-500">
          <Link href="/admin" className="hover:text-gray-900">Empresas</Link> › <Link href={`/admin/empresas/${w.companyId}`} className="hover:text-gray-900">{w.company.name}</Link> › <Link href={back} className="hover:text-gray-900">{w.name}</Link> › Nueva evaluación
        </nav>
        <h1 className="text-2xl font-semibold text-ink">Nueva evaluación · {w.name}</h1>
        <p className="text-sm text-gray-500">{w.headcount} trabajadores · Guía recomendada: <b className="text-green-700">{rec === "GUIA_III" ? "Guía III" : "Guía II"}</b></p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <form action={createEvaluation} className="card space-y-7 p-6">
          <input type="hidden" name="workplaceId" value={w.id} />

          <div className="space-y-3">
            {step(1, "Datos de la evaluación")}
            <div className="pl-9">
              <label className="label" htmlFor="name">Nombre</label>
              <input id="name" name="name" className="input max-w-md" required minLength={2} defaultValue={`Evaluación ${MONTHS.at(now.getMonth())} ${now.getFullYear()}`} />
            </div>
          </div>

          <div className="space-y-3">
            {step(2, "Cuestionario", "Se sugiere según el número de trabajadores del centro")}
            <div className="grid gap-3 pl-9 md:grid-cols-2">
              {guides.map((g) => (
                <label key={g.id} className="relative flex cursor-pointer gap-3 rounded-xl border border-line p-4 transition has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
                  <input type="radio" name="guide" value={g.id} defaultChecked={g.id === rec} className="mt-1" />
                  <span>
                    <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">{g.name}{g.id === rec && <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">Recomendada</span>}</span>
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
            {step(3, "Áreas del centro", "Serán las opciones de “Departamento / área” en el cuestionario y los filtros del tablero")}
            <div className="pl-9">
              <ChipsInput name="departments" initial={areas.length ? areas : last?.departments ?? []} suggestions={[...areas, ...(last?.departments ?? [])]}
                placeholder="Ej. Administración, Producción, Mantenimiento" suggestLabel={areas.length ? "Áreas de la plantilla o de la evaluación anterior sin agregar:" : "Áreas de la evaluación anterior sin agregar:"} />
            </div>
          </div>

          <div className="space-y-3">
            {step(4, "Tipos de puesto", "Opciones de “Tipo de puesto” en el cuestionario")}
            <div className="pl-9">
              <ChipsInput name="positions" initial={last?.positions?.length ? last.positions : POSITIONS} suggestions={POSITIONS} placeholder="Ej. Operativo, Supervisor" suggestLabel="Puestos estándar sin agregar:" />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-line pt-5">
            <Link href={back} className="btn-secondary">Cancelar</Link>
            <button className="btn-primary">Crear evaluación</button>
          </div>
        </form>

        <aside className="space-y-4">
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-ink">Qué sigue</h2>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-gray-600">
              <li>Abra la evaluación y comparta el enlace o el código QR.</li>
              <li>O importe respuestas desde Excel con la plantilla.</li>
              <li>Revise el avance contra la muestra mínima.</li>
              <li>Analice los resultados en el tablero.</li>
            </ol>
          </div>
          <div className="rounded-xl bg-brand-50 p-4 text-sm text-brand-900">
            {w.headcount > 50
              ? <>Con {w.headcount} trabajadores se requieren al menos <b>{target}</b> cuestionarios de Guía III.</>
              : w.headcount > 15
                ? <>Con {w.headcount} trabajadores, la Guía II se aplica a todo el personal: <b>{target}</b> cuestionarios.</>
                : <>Con {w.headcount} trabajadores la norma solo exige la Guía I y la política de prevención; la Guía II es opcional.</>}
          </div>
          {last && !areas.length && <p className="px-1 text-xs text-gray-500">Las áreas y puestos se tomaron de la evaluación anterior, “{last.name}”.</p>}
        </aside>
      </div>
    </div>
  );
}
