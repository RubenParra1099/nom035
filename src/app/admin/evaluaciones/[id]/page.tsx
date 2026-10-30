import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { canEdit, canSeeCompany, requireUser } from "@/lib/auth";
import { requiredGuide, sampleSize } from "@/lib/nom035/score";
import { deleteEvaluation, deleteImportedResponses, setEvaluationStatus, updateEvaluation } from "../../actions";
import Importer from "./Importer";
import EvalHeader from "@/components/EvalHeader";
import ConfirmButton from "@/components/ConfirmButton";
import CopyField from "@/components/CopyField";

export default async function EvaluationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireUser();
  const ev = await db.query.evaluations.findFirst({
    where: eq(schema.evaluations.id, id),
    with: { workplace: { with: { company: true } } },
  });
  if (!ev || !canSeeCompany(s, ev.workplace.companyId)) notFound();
  const [stats] = await db.select({
    total: sql<number>`count(*)::int`,
    online: sql<number>`count(*) filter (where ${schema.responses.source} = 'EN_LINEA')::int`,
    imported: sql<number>`count(*) filter (where ${schema.responses.source} = 'IMPORTACION')::int`,
    ats: sql<number>`count(*) filter (where ${schema.responses.atsRequires})::int`,
  }).from(schema.responses).where(eq(schema.responses.evaluationId, id));

  const h = await headers();
  const base = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const url = `${base}/e/${ev.token}`;
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 220 });
  const N = ev.workplace.headcount;
  const target = ev.guide === "GUIA_III" ? sampleSize(N) : N;
  const pct = target ? Math.min(100, Math.round((stats.total / target) * 100)) : 0;
  const rg = requiredGuide(N);
  const edit = canEdit(s);
  const statusLabel = { BORRADOR: "Borrador (no recibe respuestas)", ABIERTA: "Abierta", CERRADA: "Cerrada" }[ev.status];

  return (
    <div className="space-y-6">
      <EvalHeader ev={{ id: ev.id, name: ev.name, guide: ev.guide, includeGuideI: ev.includeGuideI, workplaceId: ev.workplaceId, workplaceName: ev.workplace.name, companyId: ev.workplace.companyId, companyName: ev.workplace.company.name }}
        active="evaluacion" canSeeConfidential={s.role !== "CLIENTE"} subtitle="Captura de respuestas, enlace del cuestionario e importación" />
      {rg && rg !== ev.guide && (
        <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-800">
          Con {N} trabajadores corresponde aplicar la {rg === "GUIA_III" ? "Guía III" : "Guía II"}.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="card p-4"><div className="text-xs text-gray-500">Respuestas</div><div className="text-3xl font-semibold">{stats.total}</div>
          <div className="text-xs text-gray-500">{stats.online} en línea · {stats.imported} importadas</div></div>
        <div className="card p-4 md:col-span-2"><div className="text-xs text-gray-500">
          {ev.guide === "GUIA_III" ? `Avance contra la muestra mínima (${target} de ${N} trabajadores)` : `Avance contra el total de trabajadores (${N})`}</div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-gray-100"><div className="h-full bg-brand-600" style={{ width: `${pct}%` }} /></div>
          <div className="mt-1 text-sm">{pct}%</div></div>
        <div className="card p-4"><div className="text-xs text-gray-500">Guía I · requieren valoración clínica</div>
          <div className="text-3xl font-semibold text-red-600">{stats.ats}</div></div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link className="btn-primary" href={`/admin/evaluaciones/${id}/indicadores`}>Abrir tablero e indicadores →</Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card space-y-3 p-5">
          <h2 className="font-semibold">Enlace del cuestionario</h2>
          <p className="text-sm text-gray-600">Estado: <b>{statusLabel}</b></p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="Código QR del cuestionario" className="h-44 w-44 rounded-lg border" />
            <div className="min-w-0 flex-1 space-y-3">
              <CopyField value={url} />
              <a href={url} target="_blank" className="text-sm text-brand-700 hover:underline">Abrir cuestionario ↗</a>
              {edit && (
                <div className="flex flex-wrap gap-2">
                  {(["ABIERTA", "CERRADA", "BORRADOR"] as const).filter((x) => x !== ev.status).map((st) => (
                    <form key={st} action={setEvaluationStatus}>
                      <input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={st} />
                      <button className="btn-secondary">{st === "ABIERTA" ? "Abrir captura" : st === "CERRADA" ? "Cerrar captura" : "Pasar a borrador"}</button>
                    </form>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {edit && (
          <section className="card space-y-3 p-5">
            <h2 className="font-semibold">Subir respuestas desde Excel</h2>
            <p className="text-sm text-gray-600">Acepta la plantilla de captura o el Excel/CSV exportado de Google Forms (como “NOM-035 MADRE 72/46”). Se detectan los reactivos por su número, se valida la guía y se recalcula todo con las reglas oficiales.</p>
            <Importer evaluationId={id} guide={ev.guide} existing={stats.imported} name={ev.name} departments={ev.departments} positions={ev.positions} includeGuideI={ev.includeGuideI} />
            {stats.imported > 0 && (
              <form action={deleteImportedResponses}>
                <input type="hidden" name="id" value={id} />
                <ConfirmButton className="btn-danger" message={`¿Eliminar las ${stats.imported} respuestas importadas?`}>Eliminar respuestas importadas</ConfirmButton>
              </form>
            )}
          </section>
        )}
      </div>

      {edit && (
        <form action={updateEvaluation} className="card grid gap-3 p-5 md:grid-cols-2">
          <input type="hidden" name="id" value={id} />
          <h2 className="font-semibold md:col-span-2">Configuración</h2>
          <div className="md:col-span-2"><label className="label">Nombre</label><input name="name" defaultValue={ev.name} className="input" /></div>
          <div><label className="label">Departamentos / áreas (uno por línea)</label><textarea name="departments" rows={5} className="input" defaultValue={ev.departments.join("\n")} /></div>
          <div><label className="label">Tipos de puesto (uno por línea)</label><textarea name="positions" rows={5} className="input" defaultValue={ev.positions.join("\n")} /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="includeGuideI" defaultChecked={ev.includeGuideI} /> Incluir Guía I</label>
          <div className="md:text-right"><button className="btn-primary">Guardar</button></div>
        </form>
      )}

      {s.role === "SUPERADMIN" && (
        <form action={deleteEvaluation} className="text-right">
          <input type="hidden" name="id" value={id} />
          <ConfirmButton className="btn-danger" message="¿Eliminar la evaluación y todas sus respuestas? No se puede deshacer.">Eliminar evaluación</ConfirmButton>
        </form>
      )}
    </div>
  );
}
