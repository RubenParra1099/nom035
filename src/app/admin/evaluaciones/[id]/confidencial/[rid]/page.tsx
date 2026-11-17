import { PrintHeader } from "@/components/Logo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { audit, canSeeCompany, requireUser } from "@/lib/auth";
import { folioOf } from "@/lib/results";
import PrintButton from "@/components/PrintButton";
import WorkerSheet from "../WorkerSheet";

export const dynamic = "force-dynamic";

export default async function WorkerSheetPage({ params }: { params: Promise<{ id: string; rid: string }> }) {
  const { id, rid } = await params;
  const s = await requireUser(["SUPERADMIN", "CONSULTOR"]);
  const ev = await db.query.evaluations.findFirst({ where: eq(schema.evaluations.id, id), with: { workplace: { with: { company: true } } } });
  // Se puede abrir por id de la respuesta o por su folio anónimo (desde la ficha técnica del reactivo)
  let r = await db.query.responses.findFirst({ where: and(eq(schema.responses.id, rid), eq(schema.responses.evaluationId, id)) });
  if (!r && /^[0-9A-F]{6}$/i.test(rid)) {
    const ids = await db.select({ id: schema.responses.id }).from(schema.responses).where(eq(schema.responses.evaluationId, id));
    const hit = ids.find((x) => folioOf(x.id) === rid.toUpperCase());
    if (hit) r = await db.query.responses.findFirst({ where: eq(schema.responses.id, hit.id) });
  }
  if (!ev || !r || !canSeeCompany(s, ev.workplace.companyId)) notFound();
  const [contact, follow, ident] = await Promise.all([
    db.query.confidentialContacts.findFirst({ where: eq(schema.confidentialContacts.responseId, r.id) }),
    db.query.atsFollowups.findFirst({ where: eq(schema.atsFollowups.responseId, r.id) }),
    db.query.respondentIdentities.findFirst({ where: eq(schema.respondentIdentities.responseId, r.id) }),
  ]);
  await audit(s, "view-worker-sheet", "response", r.id);
  const back = `/admin/evaluaciones/${id}/confidencial`;

  return (
    <div className="space-y-4 print:space-y-2">
      <PrintHeader>NOM-035-STPS-2018 · Documento confidencial<br />Impreso el {new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}</PrintHeader>
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <Link href={back} className="text-sm font-medium text-brand-700 hover:underline">← Seguimiento Guía I</Link>
        <PrintButton />
      </div>
      <WorkerSheet ev={ev} r={r} contact={contact} follow={follow} ident={ident} />
    </div>
  );
}
