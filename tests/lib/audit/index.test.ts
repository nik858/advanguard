// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Lead } from "@/types/audit";

const lead: Lead = { email: "matt@brightsmile.com", firstName: "Matt", domain: "brightsmile.com" };

const htmlSignals = {
  hasMetaPixel: false, hasGoogleAnalytics: true, hasGoogleAds: false, hasBookingWidget: false,
  hasTestimonials: true, hasBeforeAfterGallery: false, hasFaq: false, schemaTypes: [],
  hasLiveChat: false, hasHomepageVideo: false, hasPricingInfo: false, hasGoogleReviews: false,
  hasTeamPage: true, isMultilingual: false, servicePageCount: 3, hasViewportMeta: true,
  metaTitle: "Bright Smile", metaDescription: null, hasPhone: true, hasAddress: true,
};

describe("runAudit", () => {
  beforeEach(() => { vi.resetModules(); vi.restoreAllMocks(); });

  it("happy path: posts the AI-generated email to GHL", async () => {
    const postAuditToGHL = vi.fn().mockResolvedValue(undefined);
    vi.doMock("@/lib/audit/domain", () => ({ resolveReachableUrl: async () => "https://brightsmile.com/" }));
    vi.doMock("@/lib/audit/scrape", () => ({ fetchHtml: async () => "<html></html>", parseSignals: () => htmlSignals }));
    vi.doMock("@/lib/audit/pagespeed", () => ({ fetchPageSpeed: async () => null }));
    vi.doMock("@/lib/audit/ai", () => ({ generateAuditEmail: async () => ({ subject: "AI subject", body: "AI body" }) }));
    vi.doMock("@/lib/ghl", () => ({ postAuditToGHL }));

    const { runAudit } = await import("@/lib/audit/index");
    await runAudit(lead);

    expect(postAuditToGHL).toHaveBeenCalledOnce();
    expect(postAuditToGHL).toHaveBeenCalledWith({
      email: "matt@brightsmile.com",
      first_name: "Matt",
      ai_email_subject: "AI subject",
      ai_email_body: "AI body",
    });
  });

  it("unreachable site: posts a fallback email to GHL", async () => {
    const postAuditToGHL = vi.fn().mockResolvedValue(undefined);
    vi.doMock("@/lib/audit/domain", () => ({ resolveReachableUrl: async () => null }));
    vi.doMock("@/lib/ghl", () => ({ postAuditToGHL }));

    const { runAudit } = await import("@/lib/audit/index");
    await runAudit(lead);

    expect(postAuditToGHL).toHaveBeenCalledOnce();
    const arg = postAuditToGHL.mock.calls[0][0];
    expect(arg.email).toBe("matt@brightsmile.com");
    expect(arg.ai_email_body).toContain("Matt");
  });

  it("AI failure: posts a fallback email to GHL", async () => {
    const postAuditToGHL = vi.fn().mockResolvedValue(undefined);
    vi.doMock("@/lib/audit/domain", () => ({ resolveReachableUrl: async () => "https://brightsmile.com/" }));
    vi.doMock("@/lib/audit/scrape", () => ({ fetchHtml: async () => "<html></html>", parseSignals: () => htmlSignals }));
    vi.doMock("@/lib/audit/pagespeed", () => ({ fetchPageSpeed: async () => null }));
    vi.doMock("@/lib/audit/ai", () => ({ generateAuditEmail: async () => { throw new Error("claude down"); } }));
    vi.doMock("@/lib/ghl", () => ({ postAuditToGHL }));

    const { runAudit } = await import("@/lib/audit/index");
    await runAudit(lead);

    expect(postAuditToGHL).toHaveBeenCalledOnce();
    expect(postAuditToGHL.mock.calls[0][0].ai_email_body).toContain("specialist");
  });

  it("never throws, even if GHL itself fails", async () => {
    vi.doMock("@/lib/audit/domain", () => ({ resolveReachableUrl: async () => null }));
    vi.doMock("@/lib/ghl", () => ({ postAuditToGHL: vi.fn().mockRejectedValue(new Error("ghl down")) }));
    const { runAudit } = await import("@/lib/audit/index");
    await expect(runAudit(lead)).resolves.toBeUndefined();
  });
});
