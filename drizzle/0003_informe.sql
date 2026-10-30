CREATE TABLE "evaluation_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"evaluation_id" text NOT NULL,
	"activity" text,
	"objective" text,
	"activities" text,
	"conclusions" text,
	"responsible_name" text,
	"responsible_license" text,
	"report_date" date,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evaluation_reports_evaluation_id_unique" UNIQUE("evaluation_id")
);
--> statement-breakpoint
ALTER TABLE "evaluation_reports" ADD CONSTRAINT "evaluation_reports_evaluation_id_evaluations_id_fk" FOREIGN KEY ("evaluation_id") REFERENCES "public"."evaluations"("id") ON DELETE cascade ON UPDATE no action;