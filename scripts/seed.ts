import bcrypt from "bcryptjs";
import { db, schema } from "../src/db";

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL, password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) throw new Error("Define SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD");
  await db.insert(schema.users).values({
    email: email.toLowerCase(), name: "Administrador", role: "SUPERADMIN", passwordHash: await bcrypt.hash(password, 10),
  }).onConflictDoNothing();
  console.log("Administrador listo:", email);
  process.exit(0);
}
main();
