import "server-only";
import { desc, eq } from "drizzle-orm";
import { getDb } from "./client";
import { leads, type Lead, type LeadStatus, type LeadSource, type LeadAuditOutcome } from "./schema";
import type { ClinicType } from "@/lib/leads/clinic-types";

const MAX_PAGE = 200;

export type InsertLeadInput = {
  email: string;
  firstName?: string | null;
  phone?: string | null;
  domain?: string | null;
  source: LeadSource;
  clinicType?: ClinicType | null;
};

export async function insertLead(input: InsertLeadInput): Promise<Lead> {
  const rows = await getDb().insert(leads).values(input).returning();
  return rows[0];
}

export type UpdateLeadAuditInput = {
  id: string;
  subject: string;
  body: string;
  outcome: LeadAuditOutcome;
  reason?: string | null;
  signals?: unknown | null;
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
      updatedAt: new Date(),
    })
    .where(eq(leads.id, input.id));
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
  firstName?: string | null;
  phone?: string | null;
};

export async function updateLeadFields(input: UpdateLeadFieldsInput): Promise<void> {
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (input.firstName !== undefined) patch.firstName = input.firstName;
  if (input.phone !== undefined) patch.phone = input.phone;
  await getDb().update(leads).set(patch).where(eq(leads.id, input.id));
}

export async function deleteLead(id: string): Promise<void> {
  await getDb().delete(leads).where(eq(leads.id, id));
}

export async function exportLeadsForCsv(): Promise<Lead[]> {
  return getDb().select().from(leads).orderBy(desc(leads.createdAt));
}
