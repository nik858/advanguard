import "server-only";
import { desc, eq } from "drizzle-orm";
import { getDb } from "./client";
import { leads, type Lead, type LeadStatus, type LeadSource, type LeadAuditOutcome } from "./schema";
import type { ClinicType } from "@/lib/leads/clinic-types";
import type { Enrichment } from "@/types/audit";

const MAX_PAGE = 200;

export type InsertLeadInput = {
  email: string;
  firstName?: string | null;
  phone?: string | null;
  domain?: string | null;
  source: LeadSource;
  clinicType?: ClinicType | null;
  clinicUrl?: string | null;
  stripeSessionId?: string | null;
};

export async function insertLead(input: InsertLeadInput): Promise<Lead> {
  const rows = await getDb().insert(leads).values(input).returning();
  return rows[0];
}

/**
 * Idempotent insert for the paid funnel, keyed on the unique stripe_session_id.
 * Returns the new row, or null when this Checkout session was already
 * fulfilled (webhook and thank-you page can race) — callers must then skip
 * the audit so it never fires twice for one payment.
 */
export async function insertPaidLeadOnce(
  input: InsertLeadInput & { stripeSessionId: string },
): Promise<Lead | null> {
  const rows = await getDb()
    .insert(leads)
    .values(input)
    .onConflictDoNothing({ target: leads.stripeSessionId })
    .returning();
  return rows[0] ?? null;
}

export type ScheduledEmailStatus = "scheduled" | "sent" | "cancelled" | "failed";

export type ScheduledEmail = {
  tab: 1 | 2 | 3;
  resend_id: string | null;
  scheduled_for: string; // ISO timestamp
  status: ScheduledEmailStatus;
  subject: string;
  body: string;
  reason?: string | null; // why this entry is in fallback / failed state
};

export type UpdateLeadAuditInput = {
  id: string;
  subject: string;
  body: string;
  outcome: LeadAuditOutcome;
  reason?: string | null;
  signals?: unknown | null;
  enrichment?: Enrichment | null;
  scheduledEmails?: ScheduledEmail[] | null;
};

export async function updateLeadAudit(input: UpdateLeadAuditInput): Promise<void> {
  await getDb()
    .update(leads)
    .set({
      auditSubject: input.subject,
      auditBody: input.body,
      auditOutcome: input.outcome,
      auditReason: input.reason ?? null,
      signals: (input.signals ?? null) as Lead["signals"],
      enrichment: (input.enrichment ?? null) as Lead["enrichment"],
      scheduledEmails: (input.scheduledEmails ?? null) as Lead["scheduledEmails"],
      updatedAt: new Date(),
    })
    .where(eq(leads.id, input.id));
}

export async function markSequenceStopped(id: string, scheduledEmails: ScheduledEmail[]): Promise<void> {
  await getDb()
    .update(leads)
    .set({
      sequenceStopped: true,
      scheduledEmails: scheduledEmails as Lead["scheduledEmails"],
      updatedAt: new Date(),
    })
    .where(eq(leads.id, id));
}

export async function listLeads({ limit, offset }: { limit: number; offset: number }): Promise<Lead[]> {
  const cappedLimit = Math.min(Math.max(limit, 1), MAX_PAGE);
  const safeOffset = Math.max(offset, 0);
  return getDb()
    .select()
    .from(leads)
    .orderBy(desc(leads.createdAt))
    .limit(cappedLimit)
    .offset(safeOffset);
}

export async function getLead(id: string): Promise<Lead | null> {
  const rows = await getDb().select().from(leads).where(eq(leads.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function updateLeadStatus({ id, status }: { id: string; status: LeadStatus }): Promise<void> {
  await getDb()
    .update(leads)
    .set({ status, updatedAt: new Date() })
    .where(eq(leads.id, id));
}

export type UpdateLeadFieldsInput = {
  id: string;
  email?: string;
  firstName?: string | null;
  phone?: string | null;
  domain?: string | null;
  clinicType?: ClinicType | null;
};

export async function updateLeadFields(input: UpdateLeadFieldsInput): Promise<void> {
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (input.email !== undefined) patch.email = input.email;
  if (input.firstName !== undefined) patch.firstName = input.firstName;
  if (input.phone !== undefined) patch.phone = input.phone;
  if (input.domain !== undefined) patch.domain = input.domain;
  if (input.clinicType !== undefined) patch.clinicType = input.clinicType;
  await getDb().update(leads).set(patch).where(eq(leads.id, input.id));
}

export async function deleteLead(id: string): Promise<void> {
  await getDb().delete(leads).where(eq(leads.id, id));
}

export async function exportLeadsForCsv(): Promise<Lead[]> {
  return getDb().select().from(leads).orderBy(desc(leads.createdAt));
}
