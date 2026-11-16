CREATE TABLE "respondent_identities" (
	"id" text PRIMARY KEY NOT NULL,
	"response_id" text NOT NULL,
	"work_center" text NOT NULL,
	"position_type" text NOT NULL,
	"full_name" text NOT NULL,
	"position" text NOT NULL,
	"area" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "respondent_identities_response_id_unique" UNIQUE("response_id")
);
--> statement-breakpoint
ALTER TABLE "respondent_identities" ADD CONSTRAINT "respondent_identities_response_id_responses_id_fk" FOREIGN KEY ("response_id") REFERENCES "public"."responses"("id") ON DELETE cascade ON UPDATE no action;