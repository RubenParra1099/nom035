CREATE TYPE "public"."ats_status" AS ENUM('IDENTIFICADO', 'CANALIZADO', 'EN_ATENCION', 'ATENDIDO', 'NO_LOCALIZABLE');--> statement-breakpoint
CREATE TYPE "public"."complaint_status" AS ENUM('RECIBIDA', 'EN_INVESTIGACION', 'CERRADA');--> statement-breakpoint
CREATE TABLE "ats_followups" (
	"id" text PRIMARY KEY NOT NULL,
	"response_id" text NOT NULL,
	"status" "ats_status" DEFAULT 'IDENTIFICADO' NOT NULL,
	"identified_at" date DEFAULT now() NOT NULL,
	"canalized_at" date,
	"closed_at" date,
	"institution" text,
	"notes" text,
	CONSTRAINT "ats_followups_response_id_unique" UNIQUE("response_id")
);
--> statement-breakpoint
CREATE TABLE "complaints" (
	"id" text PRIMARY KEY NOT NULL,
	"workplace_id" text NOT NULL,
	"received_at" date NOT NULL,
	"category" text NOT NULL,
	"area" text,
	"channel" text,
	"status" "complaint_status" DEFAULT 'RECIBIDA' NOT NULL,
	"closed_at" date,
	"resolution" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_actions" (
	"id" text PRIMARY KEY NOT NULL,
	"evaluation_id" text NOT NULL,
	"domain" text NOT NULL,
	"action" text NOT NULL,
	"area" text,
	"owner" text,
	"due_date" date NOT NULL,
	"done_at" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trainings" (
	"id" text PRIMARY KEY NOT NULL,
	"workplace_id" text NOT NULL,
	"title" text NOT NULL,
	"topic" text NOT NULL,
	"held_at" date NOT NULL,
	"area" text,
	"attendees" integer DEFAULT 0 NOT NULL,
	"pre_score" double precision,
	"post_score" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ats_followups" ADD CONSTRAINT "ats_followups_response_id_responses_id_fk" FOREIGN KEY ("response_id") REFERENCES "public"."responses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_workplace_id_workplaces_id_fk" FOREIGN KEY ("workplace_id") REFERENCES "public"."workplaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_actions" ADD CONSTRAINT "plan_actions_evaluation_id_evaluations_id_fk" FOREIGN KEY ("evaluation_id") REFERENCES "public"."evaluations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trainings" ADD CONSTRAINT "trainings_workplace_id_workplaces_id_fk" FOREIGN KEY ("workplace_id") REFERENCES "public"."workplaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "complaints_wp_idx" ON "complaints" USING btree ("workplace_id");--> statement-breakpoint
CREATE INDEX "plan_actions_eval_idx" ON "plan_actions" USING btree ("evaluation_id");--> statement-breakpoint
CREATE INDEX "trainings_wp_idx" ON "trainings" USING btree ("workplace_id");--> statement-breakpoint
INSERT INTO "ats_followups" ("id", "response_id")
SELECT substr(md5(random()::text || r."id"), 1, 16), r."id" FROM "responses" r
WHERE r."ats_requires" = true
ON CONFLICT ("response_id") DO NOTHING;
