import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { databaseUrl } from "./url";

const g = globalThis as unknown as { _pg?: ReturnType<typeof postgres> };
// prepare:false es necesario con poolers tipo PgBouncer (Neon/Supabase/Vercel Postgres)
const client = g._pg ?? postgres(databaseUrl("pooled"), { prepare: false, max: 5 });
if (process.env.NODE_ENV !== "production") g._pg = client;

export const db = drizzle(client, { schema });
export { schema };
