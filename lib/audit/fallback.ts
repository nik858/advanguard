import type { Lead, AuditEmail } from "@/types/audit";

/**
 * Builds a graceful fallback email used whenever the audit pipeline fails.
 * The recipient never sees the technical reason — `reason` is for logging only.
 * The lead always receives something useful and human.
 */
export function generateFallbackEmail(lead: Lead, _reason: string): AuditEmail {
  const greeting = lead.firstName ? `Hi ${lead.firstName},` : "Hi,";
  const body = [
    greeting,
    "",
    `Thanks for requesting a website audit for ${lead.domain}.`,
    "",
    "We had trouble running our automated analysis on your site, so one of our specialists is going to review it personally and get back to you shortly with a few concrete recommendations.",
    "",
    "In the meantime, if there's anything specific you'd like us to look at, just reply to this email.",
    "",
    "The Advanguard Team",
  ].join("\n");

  return {
    subject: `Your website audit for ${lead.domain}`,
    body,
  };
}
