import type { Lead, Signals, AuditEmail, SignalsV2, Enrichment } from "@/types/audit";
import type { PromptsV2, MailKey } from "@/types/prompts";
import { resolveReachableUrl } from "@/lib/audit/domain";
import { fetchHtml, parseSignals } from "@/lib/audit/scrape";
import { fetchPageSpeed } from "@/lib/audit/pagespeed";
import { generateAuditEmails } from "@/lib/audit/ai";
import { generateFallbackEmail } from "@/lib/audit/fallback";
import { sendAuditEmail } from "@/lib/email";
import { renderHtmlTemplate } from "@/lib/audit/template";
import { updateLeadAudit, type ScheduledEmail } from "@/lib/db/leads";
import { parseEnrichment } from "@/lib/audit/enrichment";
import { crawlSite } from "@/lib/audit/crawler";
import { buildSignalsV2 } from "@/lib/audit/signals-v2";
import { loadPrompts } from "@/lib/audit/prompts";

const MAIL_KEYS: MailKey[] = ["mail_1", "mail_2", "mail_3"];

export type MailPreview = {
  tab: 1 | 2 | 3;
  delay_hours: number;
  subject: string;
  body: string;
  html: string;
  fallback: boolean;
  reason?: string | null;
};

export type PipelineResult = {
  outcome: "success" | "fallback";
  reason?: string;
  signals: Signals | null;
  enrichment: Enrichment | null;
  mails: MailPreview[]; // exactly 3 entries
};

function tabFor(key: MailKey): 1 | 2 | 3 {
  return key === "mail_1" ? 1 : key === "mail_2" ? 2 : 3;
}

function fallbackMail(lead: Lead, key: MailKey, reason: string, prompts: PromptsV2): MailPreview {
  const fb = generateFallbackEmail(lead, reason, key);
  const html = renderHtmlTemplate(prompts.html_template, {
    body: fb.body,
    subject: fb.subject,
    first_name: lead.firstName || "",
    signature: prompts.shared.signature,
    domain: lead.domain,
  });
  return {
    tab: tabFor(key),
    delay_hours: prompts.emails[key].delay_hours,
    subject: fb.subject,
    body: fb.body,
    html,
    fallback: true,
    reason,
  };
}

function renderMail(lead: Lead, key: MailKey, email: AuditEmail, prompts: PromptsV2): MailPreview {
  const html = renderHtmlTemplate(prompts.html_template, {
    body: email.body,
    subject: email.subject,
    first_name: lead.firstName || "",
    signature: prompts.shared.signature,
    domain: lead.domain,
  });
  return {
    tab: tabFor(key),
    delay_hours: prompts.emails[key].delay_hours,
    subject: email.subject,
    body: email.body,
    html,
    fallback: false,
    reason: null,
  };
}

/**
 * Runs the full audit pipeline for a lead and returns the 3 rendered mails.
 * Never throws — any catastrophic failure produces a 3-fallback-mail result.
 *
 * `promptsOverride` lets the admin preview supply edited prompts without saving.
 */
export async function runAuditPipeline(lead: Lead, promptsOverride?: PromptsV2): Promise<PipelineResult> {
  const prompts = promptsOverride ?? (await loadPrompts());

  const url = await resolveReachableUrl(lead.domain);
  if (!url) {
    console.warn("[audit] unreachable domain", { domain: lead.domain });
    return {
      outcome: "fallback",
      reason: "site unreachable",
      signals: null,
      enrichment: null,
      mails: MAIL_KEYS.map((k) => fallbackMail(lead, k, "site unreachable", prompts)),
    };
  }

  const homepageHtml = await fetchHtml(url);
  if (!homepageHtml) {
    console.warn("[audit] could not fetch HTML", { url });
    return {
      outcome: "fallback",
      reason: "could not fetch HTML",
      signals: null,
      enrichment: null,
      mails: MAIL_KEYS.map((k) => fallbackMail(lead, k, "could not fetch HTML", prompts)),
    };
  }

  const [crawl, pagespeed] = await Promise.all([
    crawlSite(url, homepageHtml).catch((e) => {
      console.warn("[audit] crawl failed", { url, error: String(e) });
      return null;
    }),
    fetchPageSpeed(url),
  ]);

  const htmlSignals = parseSignals(homepageHtml, url);
  let signalsV2: SignalsV2 | null = null;
  if (crawl) {
    try {
      signalsV2 = buildSignalsV2(crawl, pagespeed, url);
    } catch (e) {
      console.warn("[audit] signals-v2 build failed", { url, error: String(e) });
    }
  }
  const signals: Signals = {
    url,
    isHttps: url.startsWith("https://"),
    html: htmlSignals,
    pagespeed,
    v2: signalsV2 ?? undefined,
  };
  const enrichment = parseEnrichment(homepageHtml);

  let aiResult: Awaited<ReturnType<typeof generateAuditEmails>>;
  try {
    aiResult = await generateAuditEmails(signals, lead, prompts);
  } catch (e) {
    console.error("[audit] AI generation failed", { domain: lead.domain, error: String(e) });
    return {
      outcome: "fallback",
      reason: "AI generation failed",
      signals,
      enrichment,
      mails: MAIL_KEYS.map((k) => fallbackMail(lead, k, "AI generation failed", prompts)),
    };
  }

  const mails: MailPreview[] = MAIL_KEYS.map((key) => {
    const email = aiResult.emails[key];
    if (email) return renderMail(lead, key, email, prompts);
    return fallbackMail(lead, key, aiResult.errors[key] ?? "AI returned no email", prompts);
  });

  const anyFallback = mails.some((m) => m.fallback);
  return {
    outcome: anyFallback ? "fallback" : "success",
    reason: anyFallback ? mails.find((m) => m.fallback)!.reason ?? "partial fallback" : undefined,
    signals,
    enrichment,
    mails,
  };
}

/**
 * Runs the full audit for one lead and schedules the 3 sequence emails via
 * Resend. Never throws — designed to be called fire-and-forget from after()
 * in the lead route.
 */
export async function runAudit(lead: Lead): Promise<void> {
  const result = await runAuditPipeline(lead);

  const now = Date.now();
  const scheduled: ScheduledEmail[] = [];
  for (const mail of result.mails) {
    const scheduledFor = new Date(now + mail.delay_hours * 60 * 60 * 1000);
    const entry: ScheduledEmail = {
      tab: mail.tab,
      resend_id: null,
      scheduled_for: scheduledFor.toISOString(),
      status: "scheduled",
      subject: mail.subject,
      body: mail.body,
      reason: mail.fallback ? mail.reason ?? "fallback" : null,
    };
    try {
      const id = await sendAuditEmail({
        to: lead.email,
        subject: mail.subject,
        body: mail.body,
        html: mail.html,
        scheduledAt: mail.delay_hours > 0 ? scheduledFor : undefined,
      });
      entry.resend_id = id;
      entry.status = mail.delay_hours === 0 ? "sent" : "scheduled";
    } catch (e) {
      entry.status = "failed";
      entry.reason = `resend error: ${e instanceof Error ? e.message : String(e)}`;
      console.error("[audit] resend failed", { domain: lead.domain, tab: mail.tab, error: entry.reason });
    }
    scheduled.push(entry);
  }

  // Persist — keep mail 1 in auditSubject/auditBody for backwards compatibility
  // with the lead drawer which still displays those.
  try {
    await updateLeadAudit({
      id: lead.id,
      subject: result.mails[0].subject,
      body: result.mails[0].body,
      outcome: result.outcome,
      reason: result.reason ?? null,
      signals: result.signals,
      enrichment: result.enrichment ?? null,
      scheduledEmails: scheduled,
    });
  } catch (e) {
    console.error("[audit] db update failed", { id: lead.id, error: String(e) });
  }
}
