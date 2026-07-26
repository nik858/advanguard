-- Paid funnel (/paid): user-typed audit target + Stripe Checkout idempotency key.
-- IF NOT EXISTS everywhere: 0003 was hand-written without a snapshot, so the
-- generated diff re-added scheduled_emails/sequence_stopped that already live
-- in prod — this migration must be safe to run against the current database.
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "clinic_url" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "stripe_session_id" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "scheduled_emails" jsonb;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "sequence_stopped" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "leads_stripe_session_id_uidx" ON "leads" USING btree ("stripe_session_id");
