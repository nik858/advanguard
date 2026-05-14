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
    socialProfiles: ["instagram", "facebook"], hasContactForm: true,
    hasOpenGraph: false, hasFavicon: true, h1Count: 1,
    imageCount: 18, imagesWithoutAlt: 5,
    imageFormats: { jpeg: 14, png: 3, gif: 0, webp: 1, avif: 0, svg: 0, other: 0 },
  },
  pagespeed: {
    mobilePerformance: 42, desktopPerformance: 88, lcp: 4.2, cls: 0.18,
    inp: 320, fcp: 2.1, tbt: 540, speedIndex: 6.8,
    seoScore: 78, accessibilityScore: 91, bestPracticesScore: 83,
    opportunities: [
      { title: "Properly size images", description: "Serve appropriately-sized images.", savingsMs: 3200, savingsBytes: 512000, displayValue: "Potential savings of 3.2 s" },
      { title: "Eliminate render-blocking resources", description: "Defer non-critical CSS/JS.", savingsMs: 1400, savingsBytes: null, displayValue: "Potential savings of 1.4 s" },
    ],
    failedAudits: [
      { title: "Document does not have a meta description", description: "Add a meta description.", displayValue: "", category: "seo" },
      { title: "Avoid enormous network payloads", description: "Reduce total bytes.", displayValue: "Total size was 4,521 KiB", category: "performance" },
    ],
    field: {
      overall: "SLOW",
      lcp: { value: 4.8, rating: "SLOW" },
      cls: { value: 0.05, rating: "FAST" },
      inp: { value: 250, rating: "AVERAGE" },
      fcp: { value: 2.4, rating: "AVERAGE" },
    },
    detectedPlatform: "WordPress",
    platformTips: ["Use a WordPress image-optimization plugin."],
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

  it("renders the new on-page signals", () => {
    const out = formatSignalsForPrompt(signals);
    expect(out).toContain("Social profiles linked: instagram, facebook");
    expect(out).toContain("Contact form: found");
    expect(out).toContain("Open Graph / social-share tags: not found");
    expect(out).toContain("Images: 18 total, 5 missing alt text");
    expect(out).toContain("14 jpeg");
  });

  it("renders Lighthouse opportunities, failed audits and platform", () => {
    const out = formatSignalsForPrompt(signals);
    expect(out).toContain("Best Practices score: 83");
    expect(out).toContain("Total Blocking Time: 540ms");
    expect(out).toContain("Properly size images — Potential savings of 3.2 s");
    expect(out).toContain("[seo] Document does not have a meta description");
    expect(out).toContain("[performance] Avoid enormous network payloads — Total size was 4,521 KiB");
    expect(out).toContain("Website platform detected: WordPress");
  });

  it("renders CrUX real-user field data", () => {
    const out = formatSignalsForPrompt(signals);
    expect(out).toContain("Real-user field data");
    expect(out).toContain("Overall: SLOW");
    expect(out).toContain("Largest Contentful Paint: 4.8s (SLOW)");
  });

  it("handles missing pagespeed gracefully", () => {
    const out = formatSignalsForPrompt({ ...signals, pagespeed: null });
    expect(out).toContain("PageSpeed data: unavailable");
  });
});
