import { PrintHeader } from "@/components/Logo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { audit, canSeeCompany, requireUser } from "@/lib/auth";
import PrintButton from "@/components/PrintButton";
import AutoPrint from "@/components/AutoPrint";
import WorkerSheet from "../WorkerSheet";

export const dynamic = "force-dynamic";

/** Todas las fichas confidenciales de la evaluación, una por hoja, para imprimirlas o guardarlas en un solo PDF. */
export default async function AllWorkerSheets({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ centro?: string }> }) {
  const { id } = await params;
  const { centro = "" } = await searchParams;
  const s = await requireUser(["SUPERADMIN", "CONSULTOR"]);
  const ev = await db.query.evaluations.findFirst({ where: eq(schema.evaluations.id, id), with: { workplace: { with: { company: true } } } });
  if (!ev || !canSeeCompany(s, ev.workplace.companyId)) notFound();

  // Mismo orden que la lista de respuestas: centro, área y nombre
  const rows = (await db.select({ r: schema.responses, i: schema.respondentIdentities })
    .from(schema.responses)
    .leftJoin(schema.respondentIdentities, eq(schema.respondentIdentities.responseId, schema.responses.id))
    .where(eq(schema.responses.evaluationId, id))
    .orderBy(asc(schema.respondentIdentities.workCenter), asc(schema.respondentIdentities.area), asc(schema.respondentIdentities.fullName), desc(schema.responses.submittedAt)))
    .filter((x) => !centro || x.i?.workCenter === centro);
  const ids = rows.map((x) => x.r.id);
  const [contacts, follows] = ids.length ? await Promise.all([
    db.select().from(schema.confidentialContacts).where(inArray(schema.confidentialContacts.responseId, ids)),
    db.select().from(schema.atsFollowups).where(inArray(schema.atsFollowups.responseId, ids)),
  ]) : [[], []];
  const contactOf = new Map(contacts.map((c) => [c.responseId, c]));
  const followOf = new Map(follows.map((f) => [f.responseId, f]));
  await audit(s, `print-all-worker-sheets:${rows.length}`, "evaluation", id);

  const back = `/admin/evaluaciones/${id}/confidencial${centro ? `?centro=${encodeURIComponent(centro)}` : ""}`;
  const printed = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link href={back} className="text-sm font-medium text-brand-700 hover:underline">← Seguimiento Guía I</Link>
          <p className="text-sm text-gray-600">{rows.length} fichas{centro ? ` · ${centro}` : ""} · cada una empieza en hoja nueva. En el diálogo de impresión elija <b>Guardar como PDF</b> para un solo archivo.</p>
        </div>
        <PrintButton />
      </div>
      {rows.length === 0 && <div className="card p-10 text-center text-gray-600">Esta evaluación todavía no tiene respuestas.</div>}
      {rows.map(({ r, i }, k) => (
        <div key={r.id} className={`space-y-4 print:space-y-2 ${k > 0 ? "break-before-page border-t border-line pt-6 print:border-0 print:pt-0" : ""}`}>
          <PrintHeader>NOM-035-STPS-2018 · Documento confidencial<br />Impreso el {printed}</PrintHeader>
          <WorkerSheet ev={ev} r={r} contact={contactOf.get(r.id)} follow={followOf.get(r.id)} ident={i} />
        </div>
      ))}
      {rows.length > 0 && <AutoPrint />}
    </div>
  );
}
