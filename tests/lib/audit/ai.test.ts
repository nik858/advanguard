// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Signals, Lead } from "@/types/audit";

const lead: Lead = { email: "matt@brightsmile.com", firstName: "Matt", domain: "brightsmile.com" };
const signals: Signals = {
  url: "https://brightsmile.com", isHttps: true,
  html: {
    hasMetaPixel: false, hasGoogleAnalytics: true, hasGoogleAds: false,
    hasBookingWidget: false, hasTestimonials: true, hasBeforeAfterGallery: false,
    hasFaq: false, schemaTypes: [], hasLiveChat: false, hasHomepageVideo: false,
    hasPricingInfo: false, hasGoogleReviews: false, hasTeamPage: true,
    isMultilingual: false, servicePageCount: 3, hasViewportMeta: true,
    metaTitle: "Bright Smile Dental", metaDescription: null, hasPhone: true, hasAddress: true,
    socialProfiles: [], hasContactForm: false, hasOpenGraph: false, hasFavicon: false,
    h1Count: 1, imageCount: 0, imagesWithoutAlt: 0,
    imageFormats: { jpeg: 0, png: 0, gif: 0, webp: 0, avif: 0, svg: 0, other: 0 },
  },
  pagespeed: null,
};

const PROMPTS = {
  version: 1, system_prompt: "sys", email_instructions: "email instr",
  subject_instructions: "subj instr", tone: "warm", signature: "The Advanguard Team",
};

describe("generateAuditEmail", () => {
  beforeEach(() => { vi.resetModules(); vi.restoreAllMocks(); process.env.ANTHROPIC_API_KEY = "test-key"; });

  it("returns the parsed subject and body from Claude's JSON response", async () => {
    vi.doMock("@/lib/audit/prompts", () => ({ loadPrompts: async () => PROMPTS }));
    const createMock = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: '{"subject":"Matt, a quick look at brightsmile.com","body":"Hi Matt,\\n\\nI took a look..."}' }],
    });
    vi.doMock("@anthropic-ai/sdk", () => ({
      default: vi.fn().mockImplementation(function () { return { messages: { create: createMock } }; }),
    }));
    const { generateAuditEmail } = await import("@/lib/audit/ai");
    const email = await generateAuditEmail(signals, lead);
    expect(email.subject).toContain("brightsmile.com");
    expect(email.body).toContain("Hi Matt");
    expect(createMock).toHaveBeenCalledOnce();
  });

  it("throws when Claude returns unparseable content", async () => {
    vi.doMock("@/lib/audit/prompts", () => ({ loadPrompts: async () => PROMPTS }));
    vi.doMock("@anthropic-ai/sdk", () => ({
      default: vi.fn().mockImplementation(function () {
        return { messages: { create: vi.fn().mockResolvedValue({ content: [{ type: "text", text: "not json at all" }] }) } };
      }),
    }));
    const { generateAuditEmail } = await import("@/lib/audit/ai");
    await expect(generateAuditEmail(signals, lead)).rejects.toThrow();
  });

  it("throws when the API key is missing", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    vi.doMock("@/lib/audit/prompts", () => ({ loadPrompts: async () => PROMPTS }));
    const { generateAuditEmail } = await import("@/lib/audit/ai");
    await expect(generateAuditEmail(signals, lead)).rejects.toThrow();
  });
});
