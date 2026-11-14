import { requireUser } from "@/lib/auth";
import ClientWizard from "./ClientWizard";

export const dynamic = "force-dynamic";

export default async function NewClientPage() {
  await requireUser(["SUPERADMIN", "CONSULTOR"]);
  return <ClientWizard />;
}
