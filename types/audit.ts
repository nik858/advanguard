// Domain types for the AI audit pipeline.

export type Lead = {
  email: string;
  firstName: string;        // empty string if not provided by the form
  phone?: string;
  domain: string;           // extracted from the email, lowercased
  userAgent?: string;
  ipHash?: string;
};

/** A Lighthouse performance "opportunity" — a fix with an estimated time saving. */
export type LighthouseOpportunity = {
  title: string;        // e.g. "Properly size images"
  savingsMs: number;    // estimated load-time saving, ms
  displayValue: string; // Lighthouse's own wording, e.g. "Potential savings of 1.2 s"
};

/** A Lighthouse audit that failed, outside the performance-opportunity set. */
export type LighthouseFinding = {
  title: string;        // e.g. "Document does not have a meta description"
  category: "performance" | "seo" | "accessibility" | "best-practices";
};

export type PageSpeedSignals = {
  mobilePerformance: number | null;
  desktopPerformance: number | null;
  // Core Web Vitals + key lab metrics (from the mobile run when available)
  lcp: number | null;        // largest contentful paint, seconds
  cls: number | null;        // cumulative layout shift
  inp: number | null;        // interaction to next paint, ms
  fcp: number | null;        // first contentful paint, seconds
  tbt: number | null;        // total blocking time, ms
  speedIndex: number | null; // seconds
  // Category scores, 0-100
  seoScore: number | null;
  accessibilityScore: number | null;
  bestPracticesScore: number | null;
  // Actionable detail straight from Lighthouse
  opportunities: LighthouseOpportunity[];  // sorted by estimated saving, desc
  failedAudits: LighthouseFinding[];       // failed audits across every category
};

export type HtmlSignals = {
  hasMetaPixel: boolean;
  hasGoogleAnalytics: boolean;
  hasGoogleAds: boolean;
  hasBookingWidget: boolean;
  hasTestimonials: boolean;
  hasBeforeAfterGallery: boolean;
  hasFaq: boolean;
  schemaTypes: string[];          // e.g. ["LocalBusiness", "FAQPage"]
  hasLiveChat: boolean;
  hasHomepageVideo: boolean;
  hasPricingInfo: boolean;
  hasGoogleReviews: boolean;
  hasTeamPage: boolean;
  isMultilingual: boolean;
  servicePageCount: number;
  hasViewportMeta: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  hasPhone: boolean;
  hasAddress: boolean;
};

export type Signals = {
  url: string;              // final normalized URL that was audited
  isHttps: boolean;
  html: HtmlSignals;
  pagespeed: PageSpeedSignals | null;   // null if PageSpeed failed
};

export type AuditEmail = {
  subject: string;
  body: string;
};
