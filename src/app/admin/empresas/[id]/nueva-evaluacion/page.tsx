import Help from "@/components/ui/Help";
import Link from "next/link";
import { notFound } from "next/navigation";
import { canSeeCompany, requireUser } from "@/lib/auth";
import { generalTemplate } from "@/lib/generalEvaluation";
import { createGeneralEvaluation } from "../../../actions";
import NewEvalForm from "../../../centros/[id]/nueva-evaluacion/NewEvalForm";

export const dynamic = "force-dynamic";
const POSITIONS = ["Operativo", "Profesional o Técnico", "Auxiliar / Asistente", "Supervisor", "Coordinador", "Gerente"];
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** Nueva evaluación general: abarca todos los centros y el trabajador indica el suyo en el cuestionario. */
export default async function NewGeneralEvaluationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireUser(["SUPERADMIN", "CONSULTOR"]);
  if (!canSeeCompany(s, id)) notFound();
  const t = await generalTemplate(id);
  if (!t) notFound();
  const now = new Date();
  const back = `/admin/empresas/${id}?tab=evaluaciones`;

  return (
    <div className="space-y-5">
      <div>
        <nav aria-label="Ruta" className="text-sm text-gray-500">
          <Link href="/admin" className="hover:text-gray-900">Empresas</Link> › <Link href={`/admin/empresas/${id}`} className="hover:text-gray-900">{t.company.name}</Link> › Nueva evaluación general
        </nav>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-ink">Nueva evaluación general · todos los centros<Help id="nuevaeval" /></h1>
        <p className="text-sm text-gray-500">{t.company.name} · cada trabajador elige su centro de trabajo al contestar; el tablero permite filtrar y comparar por centro.</p>
      </div>
      <NewEvalForm general action={createGeneralEvaluation.bind(null, id)} workplaceId="" back={back}
        defaultName={`Evaluación general ${MONTHS.at(now.getMonth())} ${now.getFullYear()}`}
        estructura={`/admin/empresas/${id}?tab=estructura`} headcount={t.headcount} areas={t.areas} fallbackAreas={[]}
        positions={POSITIONS} positionSuggestions={POSITIONS} source={null} />
    </div>
  );
}
