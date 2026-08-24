import "server-only";
import type Stripe from "stripe";
import { runAudit } from "@/lib/audit/index";
import { addContactToSegment } from "@/lib/email";
import { extractDomain, normalizeClinicUrl } from "@/lib/audit/domain";
import { insertPaidLeadOnce } from "@/lib/db/leads";
import type { LeadSource } from "@/lib/db/schema";
import { CLINIC_TYPES, type ClinicType } from "@/lib/leads/clinic-types";
import { PAID_VARIANTS, paidConfig } from "@/lib/landing/variants";
import type { Lead } from "@/types/audit";

// Mirror of the set in app/api/lead/route.ts (kept private there — the free
// funnel must stay untouched). Same rule: internal test domains go through
// the audit but never into the campaign contact list.
const INTERNAL_DOMAINS = new Set([
  "advanguard.agency",
  "dvanguard.agency",
  "bookingleak.com",
  "brightsmile.dev",
  "fanclaw.ai",
]);

export type FulfillResult = "fulfilled" | "already_fulfilled" | "skipped";

// The `leads.source` values a Checkout session is allowed to claim. Anything
// else in the metadata is ignored in favour of the original premium funnel —
// the session metadata is attacker-controllable in principle.
const PAID_SOURCES = new Set<string>(PAID_VARIANTS.map((v) => paidConfig(v).leadSource));

/**
 * Fulfillment for a premium Checkout session: insert the lead and fire the exact
 * same audit the free page runs, targeting the clinic URL the buyer typed.
 *
 * Idempotent — keyed on the unique stripe_session_id column, so the Stripe
 * webhook and the thank-you page can both call this for the same session and
 * the audit fires exactly once. Never throws.
 */
export async function fulfillPremiumCheckout(session: Stripe.Checkout.Session): Promise<FulfillResult> {
  if (session.payment_status !== "paid") return "skipped";

  const md = session.metadata ?? {};
  const email = md.lead_email || session.customer_details?.email || session.customer_email;
  if (!email) {
    console.error("[premium] fulfillment: session has no email", { sessionId: session.id });
    return "skipped";
  }

  const clinicUrl = md.clinic_url ? normalizeClinicUrl(md.clinic_url) : null;
  const clinicType = (CLINIC_TYPES as readonly string[]).includes(md.clinic_type ?? "")
    ? (md.clinic_type as ClinicType)
    : null;
  const emailDomain = extractDomain(email);
  // Which paid landing page sold this audit (set in the Checkout session).
  // The cast is guarded twice over: by the runtime check above and by the test
  // asserting every variant's leadSource is a declared LEAD_SOURCES value.
  const paidSource = (md.lead_source && PAID_SOURCES.has(md.lead_source)
    ? md.lead_source
    : "paid") as LeadSource;
  // The clinic identity (used in the audit emails) is the typed URL's host,
  // not the email domain — buyers may well pay with a personal address.
  const domain = clinicUrl ? new URL(clinicUrl).hostname.replace(/^www\./, "") : emailDomain;

  let row: Awaited<ReturnType<typeof insertPaidLeadOnce>>;
  try {
    row = await insertPaidLeadOnce({
      email,
      domain,
      source: paidSource, // DB value: the funnel that produced the lead
      clinicType,
      clinicUrl,
      stripeSessionId: session.id,
    });
  } catch (e) {
    console.error("[premium] fulfillment db insert failed", { sessionId: session.id, error: String(e) });
    return "skipped";
  }
  if (!row) return "already_fulfilled";

  const lead: Lead = {
    id: row.id,
    email,
    firstName: "",
    domain,
    websiteUrl: clinicUrl ?? undefined,
    userAgent: "",
    ipHash: "",
  };

  if (!INTERNAL_DOMAINS.has(emailDomain)) {
    await addContactToSegment({ email }).catch((e) =>
      console.error("[premium] resend contact sync failed", { domain, error: String(e) }),
    );
  }
  await runAudit(lead);
  return "fulfilled";
}
