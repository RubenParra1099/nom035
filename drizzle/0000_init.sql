CREATE TYPE "public"."guide" AS ENUM('GUIA_II', 'GUIA_III');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('SUPERADMIN', 'CONSULTOR', 'CLIENTE');--> statement-breakpoint
CREATE TYPE "public"."response_source" AS ENUM('EN_LINEA', 'IMPORTACION');--> statement-breakpoint
CREATE TYPE "public"."evaluation_status" AS ENUM('BORRADOR', 'ABIERTA', 'CERRADA');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"rfc" text,
	"contact" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "confidential_contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"response_id" text NOT NULL,
	"name" text NOT NULL,
	"attended" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "confidential_contacts_response_id_unique" UNIQUE("response_id")
);
--> statement-breakpoint
CREATE TABLE "evaluations" (
	"id" text PRIMARY KEY NOT NULL,
	"workplace_id" text NOT NULL,
	"name" text NOT NULL,
	"guide" "guide" NOT NULL,
	"include_guide_i" boolean DEFAULT true NOT NULL,
	"status" "evaluation_status" DEFAULT 'BORRADOR' NOT NULL,
	"token" text NOT NULL,
	"departments" text[] DEFAULT '{}' NOT NULL,
	"positions" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "responses" (
	"id" text PRIMARY KEY NOT NULL,
	"evaluation_id" text NOT NULL,
	"source" "response_source" DEFAULT 'EN_LINEA' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"demographics" jsonb NOT NULL,
	"physical" jsonb NOT NULL,
	"items" jsonb NOT NULL,
	"serves_clients" boolean,
	"is_boss" boolean,
	"guide_i" jsonb,
	"ats_event" boolean DEFAULT false NOT NULL,
	"ats_requires" boolean DEFAULT false NOT NULL,
	"final_score" integer NOT NULL,
	"final_level" text NOT NULL,
	"categories" jsonb NOT NULL,
	"domains" jsonb NOT NULL,
	"comment" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" DEFAULT 'CONSULTOR' NOT NULL,
	"company_id" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "workplaces" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"headcount" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "confidential_contacts" ADD CONSTRAINT "confidential_contacts_response_id_responses_id_fk" FOREIGN KEY ("response_id") REFERENCES "public"."responses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_workplace_id_workplaces_id_fk" FOREIGN KEY ("workplace_id") REFERENCES "public"."workplaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_evaluation_id_evaluations_id_fk" FOREIGN KEY ("evaluation_id") REFERENCES "public"."evaluations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workplaces" ADD CONSTRAINT "workplaces_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "evaluations_token_idx" ON "evaluations" USING btree ("token");--> statement-breakpoint
CREATE INDEX "responses_eval_idx" ON "responses" USING btree ("evaluation_id");