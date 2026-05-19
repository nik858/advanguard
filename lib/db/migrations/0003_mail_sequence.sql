ALTER TABLE "leads" ADD COLUMN "scheduled_emails" jsonb;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "sequence_stopped" boolean DEFAULT false NOT NULL;
