/** Resuelve la URL de Postgres con los nombres que usan Vercel/Neon, Vercel Postgres o Supabase. */
const POOLED = ["DATABASE_URL", "POSTGRES_URL", "POSTGRES_PRISMA_URL"];
const DIRECT = ["DIRECT_URL", "DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING", "POSTGRES_URL_NO_SSL"];

function pick(names: string[]) {
  for (const n of names) {
    const v = process.env[n];
    if (v && v.trim()) return v.trim();
  }
  return undefined;
}

export function databaseUrl(kind: "pooled" | "direct" = "pooled") {
  const url = kind === "direct" ? pick(DIRECT) ?? pick(POOLED) : pick(POOLED) ?? pick(DIRECT);
  if (!url) {
    const seen = Object.keys(process.env).filter((k) => /^(POSTGRES|DATABASE|PG[A-Z]*$|NEON)/.test(k));
    throw new Error(
      `No se encontró la URL de la base de datos. Define DATABASE_URL (y DIRECT_URL) en Vercel → Settings → Environment Variables ` +
        `para Production y Preview, o conecta Neon en Storage. Variables relacionadas encontradas: ${seen.join(", ") || "ninguna"}.`,
    );
  }
  return url;
}
