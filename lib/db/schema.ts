import { pgTable, uuid, text, jsonb, timestamp, index, uniqueIndex, boolean } from "drizzle-orm/pg-core";

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    firstName: text("first_name"),
    phone: text("phone"),
    domain: text("domain"),
    source: text("source").notNull().default("inbound"),
    status: text("status").notNull().default("new"),
    auditSubject: text("audit_subject"),
    auditBody: text("audit_body"),
    auditOutcome: text("audit_outcome"),
    auditReason: text("audit_reason"),
    signals: jsonb("signals"),
    enrichment: jsonb("enrichment"),
    clinicType: text("clinic_type"),
    // Paid funnel (/paid): user-typed audit target + the Stripe Checkout session
    // that paid for it. stripe_session_id is UNIQUE — it is the idempotency key
    // that guarantees one audit per payment (webhook and thank-you page race).
    clinicUrl: text("clinic_url"),
    stripeSessionId: text("stripe_session_id"),
    scheduledEmails: jsonb("scheduled_emails"),
    sequenceStopped: boolean("sequence_stopped").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("leads_created_at_desc_idx").on(t.createdAt.desc()),
    index("leads_email_idx").on(t.email),
    index("leads_status_idx").on(t.status),
    index("leads_clinic_type_idx").on(t.clinicType),
    uniqueIndex("leads_stripe_session_id_uidx").on(t.stripeSessionId),
  ],
);

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;

export const LEAD_STATUSES = ["new", "contacted", "client", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

// "paid" is the /premium funnel, "paid_slo" the /premium.slo one — the column
// is free text, so a new paid landing page needs no migration (see
// lib/landing/variants.ts).
export const LEAD_SOURCES = ["inbound", "manual", "paid", "paid_slo"] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_AUDIT_OUTCOMES = ["success", "fallback"] as const;
export type LeadAuditOutcome = (typeof LEAD_AUDIT_OUTCOMES)[number];
