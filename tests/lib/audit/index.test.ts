// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Lead } from "@/types/audit";
import type { PromptsV2 } from "@/types/prompts";

const lead: Lead = { id: "00000000-0000-0000-0000-000000000001", email: "matt@brightsmile.com", firstName: "Matt", domain: "brightsmile.com" };

const htmlSignals = {
  hasMetaPixel: false, hasGoogleAnalytics: true, hasGoogleAds: false, hasBookingWidget: false,
  hasTestimonials: true, hasBeforeAfterGallery: false, hasFaq: false, schemaTypes: [],
  hasLiveChat: false, hasHomepageVideo: false, hasPricingInfo: false, hasGoogleReviews: false,
  hasTeamPage: true, isMultilingual: false, servicePageCount: 3, hasViewportMeta: true,
  metaTitle: "Bright Smile", metaDescription: null, hasPhone: true, hasAddress: true,
  socialProfiles: [], hasContactForm: false, hasOpenGraph: false, hasFavicon: false,
  h1Count: 1, imageCount: 0, imagesWithoutAlt: 0,
  imageFormats: { jpeg: 0, png: 0, gif: 0, webp: 0, avif: 0, svg: 0, other: 0 },
};

const samplePrompts: PromptsV2 = {
  version: 2,
  shared: { system_prompt: "sys", tone: "warm", signature: "Nik" },
  html_template: "<html><body>{{body_html}}</body></html>",
  template_styles: { accent_color: "#18181b", font_family: "system", background_color: "#f5f5f5", container_width: 560, header_logo_url: "" },
  emails: {
    mail_1: { delay_hours: 0, email_instructions: "instr 1", subject_instructions: "subj 1" },
    mail_2: { delay_hours: 24, email_instructions: "instr 2", subject_instructions: "subj 2" },
    mail_3: { delay_hours: 48, email_instructions: "instr 3", subject_instructions: "subj 3" },
  },
};

function mockBaseModules(opts: {
  resolveUrl?: () => Promise<string | null>;
  fetchHtml?: () => Promise<string | null>;
  generateEmails?: () => Promise<unknown>;
  sendAuditEmail?: ReturnType<typeof vi.fn>;
  updateLeadAudit?: ReturnType<typeof vi.fn>;
}) {
  vi.doMock("@/lib/audit/prompts", () => ({ loadPrompts: async () => samplePrompts }));
  vi.doMock("@/lib/audit/domain", () => ({ resolveReachableUrl: opts.resolveUrl ?? (async () => "https://brightsmile.com/") }));
  vi.doMock("@/lib/audit/scrape", () => ({
    fetchHtml: opts.fetchHtml ?? (async () => "<html><body></body></html>"),
    parseSignals: () => htmlSignals,
  }));
  vi.doMock("@/lib/audit/pagespeed", () => ({ fetchPageSpeed: async () => null }));
  vi.doMock("@/lib/audit/crawler", () => ({
    crawlSite: async () => ({
      homepage: { url: "https://brightsmile.com/", html: "<html></html>", category: "homepage" },
      pages: [{ url: "https://brightsmile.com/", html: "<html></html>", category: "homepage" }],
    }),
  }));
  vi.doMock("@/lib/audit/enrichment", () => ({ parseEnrichment: () => ({}) }));
  vi.doMock("@/lib/audit/signals-v2", () => ({ buildSignalsV2: () => null, formatSignalsV2ForPrompt: () => "" }));
  vi.doMock("@/lib/audit/ai", () => ({
    generateAuditEmails:
      opts.generateEmails ??
      (async () => ({
        emails: {
          mail_1: { subject: "S1", body: "B1" },
          mail_2: { subject: "S2", body: "B2" },
          mail_3: { subject: "S3", body: "B3" },
        },
        errors: { mail_1: null, mail_2: null, mail_3: null },
      })),
  }));
  vi.doMock("@/lib/email", () => ({
    sendAuditEmail: opts.sendAuditEmail ?? vi.fn().mockResolvedValue("resend_id_xxx"),
  }));
  vi.doMock("@/lib/db/leads", () => ({
    updateLeadAudit: opts.updateLeadAudit ?? vi.fn().mockResolvedValue(undefined),
  }));
}

describe("runAuditPipeline", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("happy path: returns 3 mails with success outcome", async () => {
    mockBaseModules({});
    const { runAuditPipeline } = await import("@/lib/audit/index");
    const r = await runAuditPipeline(lead);
    expect(r.outcome).toBe("success");
    expect(r.mails).toHaveLength(3);
    expect(r.mails[0].subject).toBe("S1");
    expect(r.mails[1].subject).toBe("S2");
    expect(r.mails[2].subject).toBe("S3");
    expect(r.mails[0].delay_hours).toBe(0);
    expect(r.mails[1].delay_hours).toBe(24);
    expect(r.mails[2].delay_hours).toBe(48);
  });

  it("unreachable site: returns 3 fallback mails", async () => {
    mockBaseModules({ resolveUrl: async () => null });
    const { runAuditPipeline } = await import("@/lib/audit/index");
    const r = await runAuditPipeline(lead);
    expect(r.outcome).toBe("fallback");
    expect(r.signals).toBeNull();
    expect(r.mails).toHaveLength(3);
    expect(r.mails.every((m) => m.fallback)).toBe(true);
    expect(r.mails[0].body).toContain("Matt");
  });

  it("AI failure: returns 3 fallback mails with reason set", async () => {
    mockBaseModules({
      generateEmails: async () => {
        throw new Error("claude down");
      },
    });
    const { runAuditPipeline } = await import("@/lib/audit/index");
    const r = await runAuditPipeline(lead);
    expect(r.outcome).toBe("fallback");
    expect(r.reason).toContain("AI");
    expect(r.mails.every((m) => m.fallback)).toBe(true);
  });

  it("per-mail AI failure: falls back only the broken mail", async () => {
    mockBaseModules({
      generateEmails: async () => ({
        emails: {
          mail_1: { subject: "S1", body: "B1" },
          mail_2: null,
          mail_3: { subject: "S3", body: "B3" },
        },
        errors: { mail_1: null, mail_2: "parse error", mail_3: null },
      }),
    });
    const { runAuditPipeline } = await import("@/lib/audit/index");
    const r = await runAuditPipeline(lead);
    expect(r.outcome).toBe("fallback");
    expect(r.mails[0].fallback).toBe(false);
    expect(r.mails[1].fallback).toBe(true);
    expect(r.mails[2].fallback).toBe(false);
  });
});

describe("runAudit", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("happy path: schedules 3 mails via Resend and persists ids", async () => {
    const sendAuditEmail = vi.fn().mockImplementation(async (_input) => "resend_xyz");
    const updateLeadAudit = vi.fn().mockResolvedValue(undefined);
    mockBaseModules({ sendAuditEmail, updateLeadAudit });

    const { runAudit } = await import("@/lib/audit/index");
    await runAudit(lead);

    expect(sendAuditEmail).toHaveBeenCalledTimes(3);
    // mail 1 sent immediately (no scheduledAt)
    expect(sendAuditEmail.mock.calls[0][0].scheduledAt).toBeUndefined();
    // mail 2 and 3 have scheduledAt
    expect(sendAuditEmail.mock.calls[1][0].scheduledAt).toBeInstanceOf(Date);
    expect(sendAuditEmail.mock.calls[2][0].scheduledAt).toBeInstanceOf(Date);

    expect(updateLeadAudit).toHaveBeenCalledTimes(1);
    const updateArg = updateLeadAudit.mock.calls[0][0];
    expect(updateArg.outcome).toBe("success");
    expect(updateArg.scheduledEmails).toHaveLength(3);
    expect(updateArg.scheduledEmails[0].resend_id).toBe("resend_xyz");
  });

  it("never throws, even if Resend itself fails", async () => {
    const sendAuditEmail = vi.fn().mockRejectedValue(new Error("resend down"));
    const updateLeadAudit = vi.fn().mockResolvedValue(undefined);
    mockBaseModules({ sendAuditEmail, updateLeadAudit });
    const { runAudit } = await import("@/lib/audit/index");
    await expect(runAudit(lead)).resolves.toBeUndefined();
    // failed entries get status 'failed'
    expect(updateLeadAudit.mock.calls[0][0].scheduledEmails.every((e: { status: string }) => e.status === "failed")).toBe(true);
  });
});
