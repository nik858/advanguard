import "server-only";
import type Stripe from "stripe";
import { runAudit } from "@/lib/audit/index";
import { addContactToSegment } from "@/lib/email";
import { extractDomain, normalizeClinicUrl } from "@/lib/audit/domain";
import { insertPaidLeadOnce } from "@/lib/db/leads";
import { CLINIC_TYPES, type ClinicType } from "@/lib/leads/clinic-types";
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

/**
 * Fulfillment for a paid Checkout session: insert the lead and fire the exact
 * same audit the free page runs, targeting the clinic URL the buyer typed.
 *
 * Idempotent — keyed on the unique stripe_session_id column, so the Stripe
 * webhook and the thank-you page can both call this for the same session and
 * the audit fires exactly once. Never throws.
 */
export async function fulfillPaidCheckout(session: Stripe.Checkout.Session): Promise<FulfillResult> {
  if (session.payment_status !== "paid") return "skipped";

  const md = session.metadata ?? {};
  const email = md.lead_email || session.customer_details?.email || session.customer_email;
  if (!email) {
    console.error("[paid] fulfillment: session has no email", { sessionId: session.id });
    return "skipped";
  }

  const clinicUrl = md.clinic_url ? normalizeClinicUrl(md.clinic_url) : null;
  const clinicType = (CLINIC_TYPES as readonly string[]).includes(md.clinic_type ?? "")
    ? (md.clinic_type as ClinicType)
    : null;
  const emailDomain = extractDomain(email);
  // The clinic identity (used in the audit emails) is the typed URL's host,
  // not the email domain — buyers may well pay with a personal address.
  const domain = clinicUrl ? new URL(clinicUrl).hostname.replace(/^www\./, "") : emailDomain;

  let row: Awaited<ReturnType<typeof insertPaidLeadOnce>>;
  try {
    row = await insertPaidLeadOnce({
      email,
      domain,
      source: "paid",
      clinicType,
      clinicUrl,
      stripeSessionId: session.id,
    });
  } catch (e) {
    console.error("[paid] fulfillment db insert failed", { sessionId: session.id, error: String(e) });
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
      console.error("[paid] resend contact sync failed", { domain, error: String(e) }),
    );
  }
  await runAudit(lead);
  return "fulfilled";
}
