import type { Lead, Signals, AuditEmail } from "@/types/audit";
import type { Prompts } from "@/types/prompts";
import { resolveReachableUrl } from "@/lib/audit/domain";
import { fetchHtml, parseSignals } from "@/lib/audit/scrape";
import { fetchPageSpeed } from "@/lib/audit/pagespeed";
import { generateAuditEmail } from "@/lib/audit/ai";
import { generateFallbackEmail } from "@/lib/audit/fallback";
import { sendAuditEmail } from "@/lib/email";

export type PipelineResult = {
  email: AuditEmail;
  signals: Signals | null;       // null if the pipeline failed before building signals
  outcome: "success" | "fallback";
  reason?: string;               // why it fell back — for logging / preview display
};

/**
 * Runs the audit pipeline (domain → scrape → PageSpeed → Claude) and returns
 * the result. Never throws — any failure produces a graceful fallback email.
 * Does NOT touch GHL. `promptsOverride` lets a caller (e.g. the admin preview)
 * supply a prompt set directly instead of loading the saved one.
 */
export async function runAuditPipeline(lead: Lead, promptsOverride?: Prompts): Promise<PipelineResult> {
  let signals: Signals | null = null;
  try {
    const url = await resolveReachableUrl(lead.domain);
    if (!url) {
      console.warn("[audit] unreachable domain", { domain: lead.domain });
      return { email: generateFallbackEmail(lead, "site unreachable"), signals: null, outcome: "fallback", reason: "site unreachable" };
    }
    const html = await fetchHtml(url);
    if (!html) {
      console.warn("[audit] could not fetch HTML", { url });
      return { email: generateFallbackEmail(lead, "could not fetch HTML"), signals: null, outcome: "fallback", reason: "could not fetch HTML" };
    }
    const [htmlSignals, pagespeed] = await Promise.all([
      Promise.resolve(parseSignals(html, url)),
      fetchPageSpeed(url),
    ]);
    signals = {
      url,
      isHttps: url.startsWith("https://"),
      html: htmlSignals,
      pagespeed,
    };
    try {
      const email = await generateAuditEmail(signals, lead, promptsOverride);
      console.info("[audit] success", { domain: lead.domain, url });
      return { email, signals, outcome: "success" };
    } catch (e) {
      console.error("[audit] AI generation failed", { domain: lead.domain, error: String(e) });
      return { email: generateFallbackEmail(lead, "AI generation failed"), signals, outcome: "fallback", reason: "AI generation failed" };
    }
  } catch (e) {
    console.error("[audit] pipeline error", { domain: lead.domain, error: String(e) });
    return { email: generateFallbackEmail(lead, "pipeline error"), signals, outcome: "fallback", reason: "pipeline error" };
  }
}

/**
 * Runs the full audit for one lead and delivers it via Resend. Never throws —
 * designed to be called fire-and-forget from `after()` in the lead route.
 */
export async function runAudit(lead: Lead): Promise<void> {
  const result = await runAuditPipeline(lead);
  try {
    await sendAuditEmail({
      to: lead.email,
      subject: result.email.subject,
      body: result.email.body,
    });
  } catch (e) {
    console.error("[audit] email delivery failed", { domain: lead.domain, error: String(e) });
  }
}
