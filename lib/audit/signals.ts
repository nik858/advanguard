import type { Signals, ImageFormatCounts, CruxMetric } from "@/types/audit";

function yn(b: boolean): string {
  return b ? "found" : "not found";
}

function formatImageFormats(f: ImageFormatCounts): string {
  const parts = (["jpeg", "png", "gif", "webp", "avif", "svg", "other"] as const)
    .filter((k) => f[k] > 0)
    .map((k) => `${f[k]} ${k}`);
  return parts.length ? parts.join(", ") : "no <img> tags found";
}

function formatCruxMetric(label: string, m: CruxMetric | null, unit: string): string | null {
  if (!m) return null;
  const v = unit === "s" ? m.value.toFixed(1) : unit === "" ? m.value.toFixed(2) : Math.round(m.value).toString();
  return `  ${label}: ${v}${unit} (${m.rating})`;
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
    `Social profiles linked: ${h.socialProfiles.length ? h.socialProfiles.join(", ") : "none"}`,
    `Contact form: ${yn(h.hasContactForm)}`,
    `Open Graph / social-share tags: ${yn(h.hasOpenGraph)}`,
    `Favicon: ${yn(h.hasFavicon)}`,
    `H1 headings on page: ${h.h1Count}`,
    `Images: ${h.imageCount} total, ${h.imagesWithoutAlt} missing alt text`,
    `Image formats: ${formatImageFormats(h.imageFormats)}`,
    ``,
    `--- Performance (Google PageSpeed) ---`,
  ];
  if (s.pagespeed) {
    const p = s.pagespeed;
    lines.push(
      `Mobile performance: ${p.mobilePerformance ?? "n/a"} / 100`,
      `Desktop performance: ${p.desktopPerformance ?? "n/a"} / 100`,
      `First Contentful Paint: ${p.fcp != null ? p.fcp.toFixed(1) + "s" : "n/a"}`,
      `Largest Contentful Paint: ${p.lcp != null ? p.lcp.toFixed(1) + "s" : "n/a"}`,
      `Speed Index: ${p.speedIndex != null ? p.speedIndex.toFixed(1) + "s" : "n/a"}`,
      `Total Blocking Time: ${p.tbt != null ? Math.round(p.tbt) + "ms" : "n/a"}`,
      `Cumulative Layout Shift: ${p.cls != null ? p.cls.toFixed(2) : "n/a"}`,
      `Interaction to Next Paint: ${p.inp != null ? Math.round(p.inp) + "ms" : "n/a"}`,
      `SEO score: ${p.seoScore ?? "n/a"} / 100`,
      `Accessibility score: ${p.accessibilityScore ?? "n/a"} / 100`,
      `Best Practices score: ${p.bestPracticesScore ?? "n/a"} / 100`,
    );
    if (p.detectedPlatform) {
      lines.push(`Website platform detected: ${p.detectedPlatform}`);
    }
    if (p.field) {
      const f = p.field;
      lines.push(
        ``,
        `Real-user field data (Chrome UX Report, last 28 days) — what actual visitors experienced:`,
        `  Overall: ${f.overall ?? "n/a"}`,
        ...[
          formatCruxMetric("Largest Contentful Paint", f.lcp, "s"),
          formatCruxMetric("First Contentful Paint", f.fcp, "s"),
          formatCruxMetric("Cumulative Layout Shift", f.cls, ""),
          formatCruxMetric("Interaction to Next Paint", f.inp, "ms"),
        ].filter((l): l is string => l !== null),
      );
    }
    if (p.opportunities.length) {
      lines.push(
        ``,
        `Top performance opportunities (Google Lighthouse — estimated load-time savings):`,
        ...p.opportunities.map((o) => {
          const head = o.displayValue ? `${o.title} — ${o.displayValue}` : `${o.title} — ~${Math.round(o.savingsMs)}ms`;
          return `- ${head}${o.description ? `. ${o.description}` : ""}`;
        }),
      );
    }
    if (p.failedAudits.length) {
      lines.push(
        ``,
        `Other failed Lighthouse audits:`,
        ...p.failedAudits.map((a) => `- [${a.category}] ${a.title}${a.displayValue ? ` — ${a.displayValue}` : ""}`),
      );
    }
    if (p.platformTips.length) {
      lines.push(
        ``,
        `Platform-specific tips from Lighthouse:`,
        ...p.platformTips.map((t) => `- ${t}`),
      );
    }
  } else {
    lines.push(`PageSpeed data: unavailable for this site`);
  }
  return lines.join("\n");
}
