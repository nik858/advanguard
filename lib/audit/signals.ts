import type { Signals } from "@/types/audit";

function yn(b: boolean): string {
  return b ? "found" : "not found";
}

/**
 * Renders a Signals object into a compact, human-readable block that Claude
 * can reason over. Plain text, one signal per line.
 */
export function formatSignalsForPrompt(s: Signals): string {
  const h = s.html;
  const lines: string[] = [
    `Website audited: ${s.url}`,
    `HTTPS: ${s.isHttps ? "yes" : "no"}`,
    ``,
    `--- On-page signals ---`,
    `Meta/Facebook Pixel: ${yn(h.hasMetaPixel)}`,
    `Google Analytics: ${yn(h.hasGoogleAnalytics)}`,
    `Google Ads tracking: ${yn(h.hasGoogleAds)}`,
    `Online booking widget: ${yn(h.hasBookingWidget)}`,
    `Testimonials: ${yn(h.hasTestimonials)}`,
    `Before/after gallery: ${yn(h.hasBeforeAfterGallery)}`,
    `FAQ section: ${yn(h.hasFaq)}`,
    `Structured data (schema.org types): ${h.schemaTypes.length ? h.schemaTypes.join(", ") : "none"}`,
    `Live chat / chatbot: ${yn(h.hasLiveChat)}`,
    `Homepage video: ${yn(h.hasHomepageVideo)}`,
    `Pricing / financing info: ${yn(h.hasPricingInfo)}`,
    `Google Reviews / reputation widget: ${yn(h.hasGoogleReviews)}`,
    `Team / doctor credentials page: ${yn(h.hasTeamPage)}`,
    `Multilingual support: ${yn(h.isMultilingual)}`,
    `Distinct service pages: ${h.servicePageCount}`,
    `Mobile viewport meta tag: ${yn(h.hasViewportMeta)}`,
    `Page title: ${h.metaTitle ?? "missing"}`,
    `Meta description: ${h.metaDescription ?? "missing"}`,
    `Phone number on page: ${yn(h.hasPhone)}`,
    `Physical address on page: ${yn(h.hasAddress)}`,
    ``,
    `--- Performance (Google PageSpeed) ---`,
  ];
  if (s.pagespeed) {
    const p = s.pagespeed;
    lines.push(
      `Mobile performance: ${p.mobilePerformance ?? "n/a"} / 100`,
      `Desktop performance: ${p.desktopPerformance ?? "n/a"} / 100`,
      `Largest Contentful Paint: ${p.lcp != null ? p.lcp.toFixed(1) + "s" : "n/a"}`,
      `Cumulative Layout Shift: ${p.cls != null ? p.cls.toFixed(2) : "n/a"}`,
      `Interaction to Next Paint: ${p.inp != null ? p.inp + "ms" : "n/a"}`,
      `SEO score: ${p.seoScore ?? "n/a"} / 100`,
      `Accessibility score: ${p.accessibilityScore ?? "n/a"} / 100`,
    );
  } else {
    lines.push(`PageSpeed data: unavailable for this site`);
  }
  return lines.join("\n");
}
