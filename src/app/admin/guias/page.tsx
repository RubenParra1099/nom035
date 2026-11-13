import { requireUser } from "@/lib/auth";
import GuideCatalog from "./GuideCatalog";

export const metadata = { title: "Guías de referencia · NOM-035" };

/** Catálogo de las Guías de Referencia I, II y III: vista del trabajador, ficha técnica y formato impreso. */
export default async function GuidesPage() {
  await requireUser();
  return <GuideCatalog />;
}
