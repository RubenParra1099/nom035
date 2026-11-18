CREATE TABLE "dissemination_acks" (
	"id" text PRIMARY KEY NOT NULL,
	"dissemination_id" text NOT NULL,
	"name" text NOT NULL,
	"area" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "disseminations" (
	"id" text PRIMARY KEY NOT NULL,
	"workplace_id" text NOT NULL,
	"title" text NOT NULL,
	"kind" text NOT NULL,
	"message" text NOT NULL,
	"token" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medical_exams" (
	"id" text PRIMARY KEY NOT NULL,
	"workplace_id" text NOT NULL,
	"exam_date" date NOT NULL,
	"kind" text NOT NULL,
	"reason" text NOT NULL,
	"folio" text,
	"area" text,
	"provider" text,
	"result" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dissemination_acks" ADD CONSTRAINT "dissemination_acks_dissemination_id_disseminations_id_fk" FOREIGN KEY ("dissemination_id") REFERENCES "public"."disseminations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disseminations" ADD CONSTRAINT "disseminations_workplace_id_workplaces_id_fk" FOREIGN KEY ("workplace_id") REFERENCES "public"."workplaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_exams" ADD CONSTRAINT "medical_exams_workplace_id_workplaces_id_fk" FOREIGN KEY ("workplace_id") REFERENCES "public"."workplaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dissemination_acks_d_idx" ON "dissemination_acks" USING btree ("dissemination_id");--> statement-breakpoint
CREATE INDEX "disseminations_wp_idx" ON "disseminations" USING btree ("workplace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "disseminations_token_idx" ON "disseminations" USING btree ("token");--> statement-breakpoint
CREATE INDEX "medical_exams_wp_idx" ON "medical_exams" USING btree ("workplace_id");