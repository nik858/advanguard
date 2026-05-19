import type { Lead, AuditEmail } from "@/types/audit";
import type { MailKey } from "@/types/prompts";

/**
 * Builds a graceful fallback email when AI generation fails for one of the
 * three sequence mails. Each mail has its own copy so a prospect who receives
 * fallback content for all three still gets a coherent, non-repetitive sequence.
 * `reason` is for logs only — the recipient never sees it.
 */
export function generateFallbackEmail(lead: Lead, _reason: string, mailKey: MailKey = "mail_1"): AuditEmail {
  const greeting = lead.firstName ? `Hi ${lead.firstName},` : "Hi,";
  const signature = "Nik · Booking Leak";

  if (mailKey === "mail_1") {
    return {
      subject: `Your website audit for ${lead.domain}`,
      body: [
        greeting,
        "",
        `Thanks for requesting an audit for ${lead.domain}.`,
        "",
        "Our automated analysis hit a snag on your site, so I'm going to look at it personally and get back to you in the next day or two with the highest-impact fixes.",
        "",
        "In the meantime, if there's anything specific you want me to focus on (booking flow, mobile speed, content, etc.), just hit reply.",
        "",
        signature,
      ].join("\n"),
    };
  }

  if (mailKey === "mail_2") {
    return {
      subject: `Following up — ${lead.domain}`,
      body: [
        greeting,
        "",
        `Quick follow-up on the audit for ${lead.domain}.`,
        "",
        "I'm still pulling together the report, but a few things usually move the needle the most for clinic sites: clear pricing visible on the page that ranks for your top procedure, three or more high-quality images per service page, and a working booking flow that survives the mobile experience.",
        "",
        "Any of those resonate with what you're seeing on your end?",
        "",
        signature,
      ].join("\n"),
    };
  }

  // mail_3
  return {
    subject: `Last note on ${lead.domain}`,
    body: [
      greeting,
      "",
      "Last note from me — I'll stop emailing after this one.",
      "",
      `If you want, grab 15 minutes on my calendar and I'll walk you through what I found on ${lead.domain} live. I'll focus on the credibility signals that influence whether a visitor actually books (team credentials, financing options, FAQ, schema markup).`,
      "",
      "Just reply with a time that works and I'll send an invite.",
      "",
      signature,
    ].join("\n"),
  };
}
