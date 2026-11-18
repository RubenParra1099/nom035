import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { Logo } from "@/components/Logo";
import AckForm from "./AckForm";

export const dynamic = "force-dynamic";
const KIND: Record<string, string> = { POLITICA: "Política de prevención", RESULTADOS: "Resultados de la evaluación", MEDIDAS: "Medidas adoptadas", OTRO: "Información" };

export default async function DisseminationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const d = await db.query.disseminations.findFirst({ where: eq(schema.disseminations.token, token), with: { workplace: { with: { company: true } } } });
  if (!d) notFound();
  const areas = (await db.query.workplaceAreas.findMany({ where: eq(schema.workplaceAreas.workplaceId, d.workplaceId) })).map((a) => a.name).sort((a, b) => a.localeCompare(b, "es"));
  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 py-8">
      <Logo />
      <article className="card space-y-4 p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{KIND[d.kind] ?? "Información"} · NOM-035-STPS-2018</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">{d.title}</h1>
          <p className="text-sm text-gray-500">{d.workplace.company.name} · {d.workplace.name}</p>
        </div>
        <div className="whitespace-pre-line text-[15px] leading-relaxed text-ink">{d.message}</div>
      </article>
      {d.active ? <AckForm token={token} areas={areas} />
        : <div className="card p-5 text-center text-sm text-gray-600">Esta difusión ya no recibe confirmaciones.</div>}
    </main>
  );
}
