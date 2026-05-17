ALTER TABLE "leads" ADD COLUMN "clinic_type" text;--> statement-breakpoint
CREATE INDEX "leads_clinic_type_idx" ON "leads" USING btree ("clinic_type");