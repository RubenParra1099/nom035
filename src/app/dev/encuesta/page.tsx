import { notFound } from "next/navigation";
import { GUIDES } from "@/lib/nom035/guides";
import Survey from "@/app/e/[token]/Survey";

export const dynamic = "force-dynamic";

/** Vista previa local del cuestionario con datos de ejemplo (no existe en producción). Enviar fallará: no hay evaluación real. */
export default function SurveyPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const g = GUIDES.GUIA_III;
  return (
    <Survey token="vista-previa" company="Secretaría del Ayuntamiento" workplace="Todos los centros de trabajo" guide="GUIA_III" includeGuideI
      departments={["SECRETARÍA DEL AYUNTAMIENTO", "ARCHIVO MUNICIPAL"]} positions={["Operativo", "Auxiliar / Asistente", "Coordinador"]}
      sections={g.sections.map((s) => ({ ...s, items: s.items.map((n) => ({ n, text: g.text(n) })) }))} />
  );
}
