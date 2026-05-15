CREATE EXTENSION IF NOT EXISTS pgcrypto;
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"phone" text,
	"domain" text,
	"source" text DEFAULT 'inbound' NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"audit_subject" text,
	"audit_body" text,
	"audit_outcome" text,
	"audit_reason" text,
	"signals" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "leads_created_at_desc_idx" ON "leads" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "leads_email_idx" ON "leads" USING btree ("email");--> statement-breakpoint
CREATE INDEX "leads_status_idx" ON "leads" USING btree ("status");