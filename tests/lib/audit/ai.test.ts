// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Signals, Lead } from "@/types/audit";
import type { PromptsV2 } from "@/types/prompts";

const lead: Lead = { id: "00000000-0000-0000-0000-000000000001", email: "matt@brightsmile.com", firstName: "Matt", domain: "brightsmile.com" };
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

const PROMPTS: PromptsV2 = {
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

describe("generateAuditEmail (legacy, single mail)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

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

describe("generateAuditEmails (3-mail sequence)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  it("runs 3 Claude calls in parallel and returns one email per mail key", async () => {
    vi.doMock("@/lib/audit/prompts", () => ({ loadPrompts: async () => PROMPTS }));
    const createMock = vi.fn().mockImplementation(async ({ messages }: { messages: { content: string }[] }) => {
      const which = messages[0].content.includes("#1") ? "1" : messages[0].content.includes("#2") ? "2" : "3";
      return { content: [{ type: "text", text: `{"subject":"S${which}","body":"B${which}"}` }] };
    });
    vi.doMock("@anthropic-ai/sdk", () => ({
      default: vi.fn().mockImplementation(function () {
        return { messages: { create: createMock } };
      }),
    }));
    const { generateAuditEmails } = await import("@/lib/audit/ai");
    const r = await generateAuditEmails(signals, lead);
    expect(createMock).toHaveBeenCalledTimes(3);
    expect(r.emails.mail_1?.subject).toBe("S1");
    expect(r.emails.mail_2?.subject).toBe("S2");
    expect(r.emails.mail_3?.subject).toBe("S3");
    expect(r.errors.mail_1).toBeNull();
  });

  it("returns a null email + error message for any mail whose parse fails", async () => {
    vi.doMock("@/lib/audit/prompts", () => ({ loadPrompts: async () => PROMPTS }));
    const createMock = vi.fn().mockImplementation(async ({ messages }: { messages: { content: string }[] }) => {
      if (messages[0].content.includes("#2")) {
        return { content: [{ type: "text", text: "not json" }] };
      }
      return { content: [{ type: "text", text: '{"subject":"S","body":"B"}' }] };
    });
    vi.doMock("@anthropic-ai/sdk", () => ({
      default: vi.fn().mockImplementation(function () {
        return { messages: { create: createMock } };
      }),
    }));
    const { generateAuditEmails } = await import("@/lib/audit/ai");
    const r = await generateAuditEmails(signals, lead);
    expect(r.emails.mail_2).toBeNull();
    expect(r.errors.mail_2).not.toBeNull();
    expect(r.emails.mail_1).not.toBeNull();
    expect(r.emails.mail_3).not.toBeNull();
  });
});
