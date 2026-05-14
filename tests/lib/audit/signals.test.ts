// @vitest-environment node
import { describe, it, expect } from "vitest";
import { formatSignalsForPrompt } from "@/lib/audit/signals";
import type { Signals } from "@/types/audit";

const signals: Signals = {
  url: "https://brightsmile.com",
  isHttps: true,
  html: {
    hasMetaPixel: true, hasGoogleAnalytics: true, hasGoogleAds: false,
    hasBookingWidget: false, hasTestimonials: true, hasBeforeAfterGallery: false,
    hasFaq: false, schemaTypes: ["LocalBusiness"], hasLiveChat: false,
    hasHomepageVideo: false, hasPricingInfo: false, hasGoogleReviews: true,
    hasTeamPage: true, isMultilingual: false, servicePageCount: 4,
    hasViewportMeta: true, metaTitle: "Bright Smile Dental", metaDescription: null,
    hasPhone: true, hasAddress: true,
  },
  pagespeed: {
    mobilePerformance: 42, desktopPerformance: 88, lcp: 4.2, cls: 0.18,
    inp: 320, fcp: 2.1, tbt: 540, speedIndex: 6.8,
    seoScore: 78, accessibilityScore: 91, bestPracticesScore: 83,
    opportunities: [
      { title: "Properly size images", savingsMs: 3200, displayValue: "Potential savings of 3.2 s" },
      { title: "Eliminate render-blocking resources", savingsMs: 1400, displayValue: "Potential savings of 1.4 s" },
    ],
    failedAudits: [
      { title: "Document does not have a meta description", category: "seo" },
      { title: "Image elements do not have [alt] attributes", category: "accessibility" },
    ],
  },
};

describe("formatSignalsForPrompt", () => {
  it("renders a human-readable signal summary", () => {
    const out = formatSignalsForPrompt(signals);
    expect(out).toContain("https://brightsmile.com");
    expect(out).toContain("Mobile performance: 42");
    expect(out).toContain("Online booking widget: not found");
    expect(out).toContain("Testimonials: found");
  });

  it("renders Lighthouse opportunities and failed audits", () => {
    const out = formatSignalsForPrompt(signals);
    expect(out).toContain("Best Practices score: 83");
    expect(out).toContain("Total Blocking Time: 540ms");
    expect(out).toContain("Properly size images — Potential savings of 3.2 s");
    expect(out).toContain("[seo] Document does not have a meta description");
  });

  it("handles missing pagespeed gracefully", () => {
    const out = formatSignalsForPrompt({ ...signals, pagespeed: null });
    expect(out).toContain("PageSpeed data: unavailable");
  });
});
