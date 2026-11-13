import Help from "@/components/ui/Help";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { canSeeCompany, requireUser } from "@/lib/auth";
import { createEvaluation } from "../../../actions";
import NewEvalForm from "./NewEvalForm";

export const dynamic = "force-dynamic";
const POSITIONS = ["Operativo", "Profesional o Técnico", "Auxiliar / Asistente", "Supervisor", "Coordinador", "Gerente"];
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export default async function NewEvaluationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireUser(["SUPERADMIN", "CONSULTOR"]);
  const w = await db.query.workplaces.findFirst({ where: eq(schema.workplaces.id, id), with: { company: true, evaluations: true } });
  if (!w || !canSeeCompany(s, w.companyId)) notFound();
  const areaRows = await db.query.workplaceAreas.findMany({ where: eq(schema.workplaceAreas.workplaceId, id) });
  const last = [...w.evaluations].sort((a, b) => +b.createdAt - +a.createdAt)[0];
  const now = new Date();
  const back = `/admin/empresas/${w.companyId}?centro=${w.id}`;
  // Áreas de la evaluación anterior; si no se configuraron, las que contestaron los trabajadores.
  let lastAreas = last?.departments ?? [];
  if (last && !lastAreas.length) {
    const rows = await db.selectDistinct({ d: sql<string>`${schema.responses.demographics}->>'departamento'` })
      .from(schema.responses).where(eq(schema.responses.evaluationId, last.id));
    lastAreas = rows.map((r) => r.d).filter(Boolean).sort((a, b) => a.localeCompare(b, "es"));
  }
  const areas = areaRows.length
    ? [...areaRows.map((a) => ({ name: a.name, headcount: a.headcount as number | null })),
       ...lastAreas.filter((d) => !areaRows.some((a) => a.name.toLowerCase() === d.toLowerCase())).map((name) => ({ name, headcount: null }))]
    : lastAreas.map((name) => ({ name, headcount: last?.areaHeadcount?.[name] ?? null }));
  const source = areaRows.length ? "La plantilla se tomó del centro de trabajo; ajústela si cambió."
    : last && lastAreas.length ? `Las áreas y puestos se tomaron de la evaluación anterior, “${last.name}”; capture cuántos trabajadores tiene cada una.`
    : last ? `Los puestos se tomaron de la evaluación anterior, “${last.name}”.` : null;

  return (
    <div className="space-y-5">
      <div>
        <nav aria-label="Ruta" className="text-sm text-gray-500">
          <Link href="/admin" className="hover:text-gray-900">Empresas</Link> › <Link href={`/admin/empresas/${w.companyId}`} className="hover:text-gray-900">{w.company.name}</Link> › <Link href={back} className="hover:text-gray-900">{w.name}</Link> › Nueva evaluación
        </nav>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-ink">Nueva evaluación · {w.name}<Help id="nuevaeval" /></h1>
        <p className="text-sm text-gray-500">{w.company.name}</p>
      </div>
      <NewEvalForm action={createEvaluation} workplaceId={w.id} back={back} defaultName={`Evaluación ${MONTHS.at(now.getMonth())} ${now.getFullYear()}`}
        headcount={w.headcount} areas={areas} suggestions={lastAreas}
        positions={last?.positions?.length ? last.positions : POSITIONS} positionSuggestions={POSITIONS} source={source} />
    </div>
  );
}
