import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { GUIDES } from "@/lib/nom035/guides";
import Survey from "./Survey";

export const dynamic = "force-dynamic";

export default async function SurveyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ev = await db.query.evaluations.findFirst({
    where: eq(schema.evaluations.token, token),
    with: { workplace: { with: { company: true } } },
  });
  if (!ev) notFound();
  if (ev.status !== "ABIERTA") {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="card max-w-md p-6 text-center">
          <h1 className="text-lg font-semibold">Cuestionario no disponible</h1>
          <p className="mt-2 text-sm text-gray-600">{ev.status === "CERRADA" ? "El periodo de respuesta ya terminó." : "El cuestionario aún no está abierto."} Consulte con el área responsable.</p>
        </div>
      </main>
    );
  }
  const g = GUIDES[ev.guide];
  return (
    <Survey
      token={token}
      company={ev.workplace.company.name}
      workplace={ev.workplace.name}
      guide={ev.guide}
      includeGuideI={ev.includeGuideI}
      departments={ev.departments}
      positions={ev.positions}
      sections={g.sections.map((s) => ({ ...s, items: s.items.map((n) => ({ n, text: g.text(n) })) }))}
    />
  );
}
