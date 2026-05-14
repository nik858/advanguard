// Domain types for the AI audit pipeline.

export type Lead = {
  email: string;
  firstName: string;        // empty string if not provided by the form
  phone?: string;
  domain: string;           // extracted from the email, lowercased
  userAgent?: string;
  ipHash?: string;
};

export type PageSpeedSignals = {
  mobilePerformance: number | null;
  desktopPerformance: number | null;
  lcp: number | null;        // largest contentful paint, seconds
  cls: number | null;        // cumulative layout shift
  inp: number | null;        // interaction to next paint, ms
  seoScore: number | null;
  accessibilityScore: number | null;
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

export type AuditOutcome =
  | { status: "success"; signals: Signals; email: AuditEmail }
  | { status: "fallback"; reason: string; email: AuditEmail };
