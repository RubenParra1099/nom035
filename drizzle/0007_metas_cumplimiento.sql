ALTER TABLE "evaluations" ADD COLUMN "compliance" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "evaluations" ADD COLUMN "kpi_targets" jsonb DEFAULT '{}'::jsonb NOT NULL;