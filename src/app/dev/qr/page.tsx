import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { qrImages } from "@/lib/qrSheet";
import QrSheet from "@/components/QrSheet";

export const dynamic = "force-dynamic";

/** Vista previa local de la hoja con QR, con datos de ejemplo (no existe en producción). */
export default async function QrPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  // El QR apunta a este mismo servidor local (nunca a un dominio ajeno); el token de ejemplo no corresponde a ninguna evaluación
  const h = await headers();
  const url = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}/e/EJEMPLO`;
  return (
    <main className="mx-auto max-w-4xl p-6">
      <p className="no-print mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Vista previa con datos de ejemplo: este QR no abre ninguna evaluación. El QR real se descarga desde cada evaluación.</p>
      <QrSheet data={{
        company: "Secretaría del Ayuntamiento", workplace: "Todos los centros de trabajo", general: true,
        evaluation: "Evaluación general noviembre 2026", guide: "GUIA_III", includeGuideI: true, url, ...(await qrImages(url)),
      }} />
    </main>
  );
}
