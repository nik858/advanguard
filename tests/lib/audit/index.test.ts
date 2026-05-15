// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Lead } from "@/types/audit";

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

describe("runAudit", () => {
  beforeEach(() => { vi.resetModules(); vi.restoreAllMocks(); });

  it("happy path: sends the AI-generated email via Resend", async () => {
    const sendAuditEmail = vi.fn().mockResolvedValue(undefined);
    const updateLeadAudit = vi.fn().mockResolvedValue(undefined);
    vi.doMock("@/lib/audit/domain", () => ({ resolveReachableUrl: async () => "https://brightsmile.com/" }));
    vi.doMock("@/lib/audit/scrape", () => ({ fetchHtml: async () => "<html></html>", parseSignals: () => htmlSignals }));
    vi.doMock("@/lib/audit/pagespeed", () => ({ fetchPageSpeed: async () => null }));
    vi.doMock("@/lib/audit/ai", () => ({ generateAuditEmail: async () => ({ subject: "AI subject", body: "AI body" }) }));
    vi.doMock("@/lib/email", () => ({ sendAuditEmail }));
    vi.doMock("@/lib/db/leads", () => ({ updateLeadAudit }));

    const { runAudit } = await import("@/lib/audit/index");
    await runAudit(lead);

    expect(sendAuditEmail).toHaveBeenCalledOnce();
    expect(sendAuditEmail).toHaveBeenCalledWith({
      to: "matt@brightsmile.com",
      subject: "AI subject",
      body: "AI body",
    });
    expect(updateLeadAudit).toHaveBeenCalledTimes(1);
    expect(updateLeadAudit).toHaveBeenCalledWith(expect.objectContaining({
      id: lead.id,
      subject: "AI subject",
      body: "AI body",
      outcome: "success",
    }));
  });

  it("unreachable site: sends a fallback email via Resend", async () => {
    const sendAuditEmail = vi.fn().mockResolvedValue(undefined);
    const updateLeadAudit = vi.fn().mockResolvedValue(undefined);
    vi.doMock("@/lib/audit/domain", () => ({ resolveReachableUrl: async () => null }));
    vi.doMock("@/lib/email", () => ({ sendAuditEmail }));
    vi.doMock("@/lib/db/leads", () => ({ updateLeadAudit }));

    const { runAudit } = await import("@/lib/audit/index");
    await runAudit(lead);

    expect(sendAuditEmail).toHaveBeenCalledOnce();
    const arg = sendAuditEmail.mock.calls[0][0];
    expect(arg.to).toBe("matt@brightsmile.com");
    expect(arg.body).toContain("Matt");
  });

  it("AI failure: sends a fallback email via Resend", async () => {
    const sendAuditEmail = vi.fn().mockResolvedValue(undefined);
    const updateLeadAudit = vi.fn().mockResolvedValue(undefined);
    vi.doMock("@/lib/audit/domain", () => ({ resolveReachableUrl: async () => "https://brightsmile.com/" }));
    vi.doMock("@/lib/audit/scrape", () => ({ fetchHtml: async () => "<html></html>", parseSignals: () => htmlSignals }));
    vi.doMock("@/lib/audit/pagespeed", () => ({ fetchPageSpeed: async () => null }));
    vi.doMock("@/lib/audit/ai", () => ({ generateAuditEmail: async () => { throw new Error("claude down"); } }));
    vi.doMock("@/lib/email", () => ({ sendAuditEmail }));
    vi.doMock("@/lib/db/leads", () => ({ updateLeadAudit }));

    const { runAudit } = await import("@/lib/audit/index");
    await runAudit(lead);

    expect(sendAuditEmail).toHaveBeenCalledOnce();
    expect(sendAuditEmail.mock.calls[0][0].body).toContain("specialist");
  });

  it("never throws, even if Resend itself fails", async () => {
    const updateLeadAudit = vi.fn().mockResolvedValue(undefined);
    vi.doMock("@/lib/audit/domain", () => ({ resolveReachableUrl: async () => null }));
    vi.doMock("@/lib/email", () => ({ sendAuditEmail: vi.fn().mockRejectedValue(new Error("resend down")) }));
    vi.doMock("@/lib/db/leads", () => ({ updateLeadAudit }));
    const { runAudit } = await import("@/lib/audit/index");
    await expect(runAudit(lead)).resolves.toBeUndefined();
  });

  it("calls updateLeadAudit with outcome 'fallback' when the AI fails", async () => {
    const sendAuditEmail = vi.fn().mockResolvedValue(undefined);
    const updateLeadAudit = vi.fn().mockResolvedValue(undefined);
    vi.doMock("@/lib/audit/domain", () => ({ resolveReachableUrl: async () => "https://brightsmile.com/" }));
    vi.doMock("@/lib/audit/scrape", () => ({ fetchHtml: async () => "<html></html>", parseSignals: () => htmlSignals }));
    vi.doMock("@/lib/audit/pagespeed", () => ({ fetchPageSpeed: async () => null }));
    vi.doMock("@/lib/audit/ai", () => ({ generateAuditEmail: async () => { throw new Error("claude down"); } }));
    vi.doMock("@/lib/email", () => ({ sendAuditEmail }));
    vi.doMock("@/lib/db/leads", () => ({ updateLeadAudit }));

    const { runAudit } = await import("@/lib/audit/index");
    await runAudit(lead);

    expect(updateLeadAudit).toHaveBeenCalledWith(expect.objectContaining({
      id: lead.id,
      outcome: "fallback",
    }));
  });
});

describe("runAuditPipeline", () => {
  beforeEach(() => { vi.resetModules(); vi.restoreAllMocks(); });

  it("returns success + signals + AI email on the happy path", async () => {
    vi.doMock("@/lib/audit/domain", () => ({ resolveReachableUrl: async () => "https://brightsmile.com/" }));
    vi.doMock("@/lib/audit/scrape", () => ({ fetchHtml: async () => "<html></html>", parseSignals: () => htmlSignals }));
    vi.doMock("@/lib/audit/pagespeed", () => ({ fetchPageSpeed: async () => null }));
    vi.doMock("@/lib/audit/ai", () => ({ generateAuditEmail: async () => ({ subject: "AI subject", body: "AI body" }) }));
    vi.doMock("@/lib/email", () => ({ sendAuditEmail: vi.fn() }));
    const { runAuditPipeline } = await import("@/lib/audit/index");
    const r = await runAuditPipeline(lead);
    expect(r.outcome).toBe("success");
    expect(r.signals).not.toBeNull();
    expect(r.email).toEqual({ subject: "AI subject", body: "AI body" });
  });

  it("returns fallback + null signals when the site is unreachable", async () => {
    vi.doMock("@/lib/audit/domain", () => ({ resolveReachableUrl: async () => null }));
    vi.doMock("@/lib/email", () => ({ sendAuditEmail: vi.fn() }));
    const { runAuditPipeline } = await import("@/lib/audit/index");
    const r = await runAuditPipeline(lead);
    expect(r.outcome).toBe("fallback");
    expect(r.signals).toBeNull();
    expect(r.email.body).toContain("Matt");
  });

  it("passes a prompts override through to generateAuditEmail", async () => {
    const genMock = vi.fn().mockResolvedValue({ subject: "S", body: "B" });
    vi.doMock("@/lib/audit/domain", () => ({ resolveReachableUrl: async () => "https://brightsmile.com/" }));
    vi.doMock("@/lib/audit/scrape", () => ({ fetchHtml: async () => "<html></html>", parseSignals: () => htmlSignals }));
    vi.doMock("@/lib/audit/pagespeed", () => ({ fetchPageSpeed: async () => null }));
    vi.doMock("@/lib/audit/ai", () => ({ generateAuditEmail: genMock }));
    vi.doMock("@/lib/email", () => ({ sendAuditEmail: vi.fn() }));
    const { runAuditPipeline } = await import("@/lib/audit/index");
    const override = { version: 1, system_prompt: "x", email_instructions: "x", subject_instructions: "x", tone: "x", signature: "x" };
    await runAuditPipeline(lead, override);
    expect(genMock).toHaveBeenCalledWith(expect.anything(), expect.anything(), override);
  });
});
