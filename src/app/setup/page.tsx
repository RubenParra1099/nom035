import { sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import SetupForm from "./SetupForm";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.users);
  if (n > 0) redirect("/login");
  return <SetupForm missingSecret={!process.env.AUTH_SECRET} />;
}
