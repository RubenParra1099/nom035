import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { canSeeCompany, requireUser } from "@/lib/auth";
import { qrImages } from "@/lib/qrSheet";
import QrSheet from "@/components/QrSheet";

export const dynamic = "force-dynamic";

/** Hoja con el QR de la evaluación para imprimir (PDF) o compartir como imagen. */
export default async function QrSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireUser();
  const ev = await db.query.evaluations.findFirst({ where: eq(schema.evaluations.id, id), with: { workplace: { with: { company: true } } } });
  if (!ev || !canSeeCompany(s, ev.workplace.companyId)) notFound();
  const h = await headers();
  const url = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}/e/${ev.token}`;

  return (
    <div className="space-y-4">
      <nav aria-label="Ruta" className="no-print text-sm text-gray-500">
        <Link href={`/admin/empresas/${ev.workplace.companyId}`} className="hover:text-gray-900">{ev.workplace.company.name}</Link> › <Link href={`/admin/evaluaciones/${id}`} className="hover:text-gray-900">{ev.name}</Link> › Hoja con QR
      </nav>
      <QrSheet data={{
        company: ev.workplace.company.name, workplace: ev.workplace.name, general: ev.workplace.general,
        evaluation: ev.name, guide: ev.guide, includeGuideI: ev.includeGuideI, url, ...(await qrImages(url)),
      }} />
    </div>
  );
}
