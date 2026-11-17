ALTER TABLE "companies" ADD COLUMN "demo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "demo_access" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Acceso a demos solo para el dueño de la plataforma
UPDATE "users" SET "demo_access" = true WHERE lower(trim("email")) = 'ruben.parralopez@gmail.com';--> statement-breakpoint
-- Empresas de demostración
UPDATE "companies" SET "demo" = true
WHERE "name" ~* '^\s*yura\s+corporation'
   OR "name" ~* '^\s*manufacturas\s+del\s+baj[ií]o';
