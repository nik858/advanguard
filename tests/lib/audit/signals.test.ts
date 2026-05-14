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
    inp: 320, seoScore: 78, accessibilityScore: 91,
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

  it("handles missing pagespeed gracefully", () => {
    const out = formatSignalsForPrompt({ ...signals, pagespeed: null });
    expect(out).toContain("PageSpeed data: unavailable");
  });
});
