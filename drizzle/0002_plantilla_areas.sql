CREATE TABLE "workplace_areas" (
	"id" text PRIMARY KEY NOT NULL,
	"workplace_id" text NOT NULL,
	"name" text NOT NULL,
	"headcount" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workplace_areas" ADD CONSTRAINT "workplace_areas_workplace_id_workplaces_id_fk" FOREIGN KEY ("workplace_id") REFERENCES "public"."workplaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "workplace_areas_name_idx" ON "workplace_areas" USING btree ("workplace_id","name");