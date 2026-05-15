import { pgTable, uuid, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";

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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("leads_created_at_desc_idx").on(t.createdAt.desc()),
    index("leads_email_idx").on(t.email),
    index("leads_status_idx").on(t.status),
  ],
);

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;

export const LEAD_STATUSES = ["new", "contacted", "client", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_SOURCES = ["inbound", "manual"] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_AUDIT_OUTCOMES = ["success", "fallback"] as const;
export type LeadAuditOutcome = (typeof LEAD_AUDIT_OUTCOMES)[number];
