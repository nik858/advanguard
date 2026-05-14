import type { Lead, Signals, AuditEmail } from "@/types/audit";
import { resolveReachableUrl } from "@/lib/audit/domain";
import { fetchHtml, parseSignals } from "@/lib/audit/scrape";
import { fetchPageSpeed } from "@/lib/audit/pagespeed";
import { generateAuditEmail } from "@/lib/audit/ai";
import { generateFallbackEmail } from "@/lib/audit/fallback";
import { postAuditToGHL } from "@/lib/ghl";

/**
 * Runs the full audit pipeline for one lead and delivers the result to GHL.
 * Never throws: any failure is caught, logged, and turned into a graceful
 * fallback email so the lead always receives something. Designed to be called
 * from `after()` in the lead route — fire-and-forget background work.
 */
export async function runAudit(lead: Lead): Promise<void> {
  let email: AuditEmail;

  try {
    const url = await resolveReachableUrl(lead.domain);
    if (!url) {
      console.warn("[audit] unreachable domain", { domain: lead.domain });
      email = generateFallbackEmail(lead, "site unreachable");
    } else {
      const html = await fetchHtml(url);
      if (!html) {
        console.warn("[audit] could not fetch HTML", { url });
        email = generateFallbackEmail(lead, "could not fetch HTML");
      } else {
        const [htmlSignals, pagespeed] = await Promise.all([
          Promise.resolve(parseSignals(html, url)),
          fetchPageSpeed(url),
        ]);
        const signals: Signals = {
          url,
          isHttps: url.startsWith("https://"),
          html: htmlSignals,
          pagespeed,
        };
        try {
          email = await generateAuditEmail(signals, lead);
          console.info("[audit] success", { domain: lead.domain, url });
        } catch (e) {
          console.error("[audit] AI generation failed", { domain: lead.domain, error: String(e) });
          email = generateFallbackEmail(lead, "AI generation failed");
        }
      }
    }
  } catch (e) {
    console.error("[audit] pipeline error", { domain: lead.domain, error: String(e) });
    email = generateFallbackEmail(lead, "pipeline error");
  }

  try {
    await postAuditToGHL({
      email: lead.email,
      first_name: lead.firstName,
      ai_email_subject: email.subject,
      ai_email_body: email.body,
    });
  } catch (e) {
    // Last line of defense — log and swallow so `after()` never sees a rejection.
    console.error("[audit] GHL delivery failed", { domain: lead.domain, error: String(e) });
  }
}
