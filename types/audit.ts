// Domain types for the AI audit pipeline.

export type Lead = {
  id: string;               // UUID — the leads-table row id created in /api/lead
  email: string;
  firstName: string;        // empty string if not provided by the form
  phone?: string;
  domain: string;           // extracted from the email, lowercased
  userAgent?: string;
  ipHash?: string;
};

/** A Lighthouse performance "opportunity" — a fix with an estimated time saving. */
export type LighthouseOpportunity = {
  title: string;             // e.g. "Properly size images"
  description: string;       // how to fix it (markdown links stripped)
  savingsMs: number;         // estimated load-time saving, ms
  savingsBytes: number | null; // estimated transfer-size saving, bytes
  displayValue: string;      // Lighthouse's own wording, e.g. "Potential savings of 1.2 s"
};

/** A Lighthouse audit that failed, outside the performance-opportunity set. */
export type LighthouseFinding = {
  title: string;        // e.g. "Document does not have a meta description"
  description: string;  // how to fix it (markdown links stripped)
  displayValue: string; // concrete value, e.g. "Total size was 4,521 KiB" (may be empty)
  category: "performance" | "seo" | "accessibility" | "best-practices";
};

/** One real-user metric from the Chrome UX Report (CrUX). */
export type CruxMetric = {
  value: number;        // lcp/fcp in seconds, cls unitless, inp in ms
  rating: "FAST" | "AVERAGE" | "SLOW";
};

/** Field data — what real Chrome visitors actually experienced (last 28 days). */
export type CruxData = {
  overall: "FAST" | "AVERAGE" | "SLOW" | null;
  lcp: CruxMetric | null;
  cls: CruxMetric | null;
  inp: CruxMetric | null;
  fcp: CruxMetric | null;
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
  // Real-user field data (null when the site has too little CrUX traffic)
  field: CruxData | null;
  // Platform / CMS Lighthouse detected (e.g. "WordPress"), null if none
  detectedPlatform: string | null;
  // Platform-specific advice Lighthouse returned for the issues this site has
  platformTips: string[];
};

/** Count of <img> tags on the page broken down by file format. */
export type ImageFormatCounts = {
  jpeg: number;
  png: number;
  gif: number;
  webp: number;
  avif: number;
  svg: number;
  other: number;   // unknown extension, data URIs, etc.
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
  // Reach / conversion signals
  socialProfiles: string[];       // e.g. ["instagram", "facebook"]
  hasContactForm: boolean;
  hasOpenGraph: boolean;          // og: tags — controls how the site previews when shared
  hasFavicon: boolean;
  h1Count: number;                // 0 or >1 are both SEO problems
  // Image health
  imageCount: number;
  imagesWithoutAlt: number;
  imageFormats: ImageFormatCounts;
};

export type Signals = {
  url: string;              // final normalized URL that was audited
  isHttps: boolean;
  html: HtmlSignals;
  pagespeed: PageSpeedSignals | null;   // null if PageSpeed failed
  v2?: SignalsV2;           // optional richer v2 structure attached to the same row
};

// ---------- SignalsV2 — multi-page, threshold-based ----------

export type TrackingMissing = "meta_pixel" | "google_ads" | "google_analytics";

export type SignalsV2 = {
  url: string;
  is_https: boolean;
  pages_crawled: number;
  service_page_urls: string[];

  // Email 1 signals (1-6)
  before_after: { case_count: number; pass: boolean };
  booking_widget: {
    homepage: boolean;
    service_pages: { url: string; pass: boolean }[];
    pass: boolean;
    booking_homepage_only: boolean;
    missing_pages: string[];
  };
  testimonials: { onsite_count: number; pass: boolean };
  live_chat: { platform: string | null; pass: boolean };
  mobile_responsive: { score: number | null; pass: boolean; critical: boolean };
  tracking: {
    meta_pixel: boolean;
    google_ads: boolean;
    google_analytics: boolean;
    missing: TrackingMissing[];
    pass: boolean;
  };

  // Email 2 signals (7-10)
  images_per_service_page: {
    pages: { url: string; count: number; pass: boolean }[];
    pass: boolean;
    no_individual_service_pages: boolean;
  };
  pricing: { pass: boolean; gated: boolean; free_consult_offered: boolean };
  homepage_video: { pass: boolean };
  page_speed: { score: number | null; pass: boolean; critical: boolean };

  // Email 3 signals (11-16)
  team_credentials: {
    has_named_provider: boolean;
    has_photo: boolean;
    has_credential: boolean;
    pass: boolean;
  };
  ssl: { pass: boolean };
  schema_local_business: { pass: boolean; types_found: string[] };
  multilingual: { pass: boolean };
  financing_partners: { detected: string[]; pass: boolean };
  faq: { pass: boolean };
};

export type AuditEmail = {
  subject: string;
  body: string;
};

export type Enrichment = {
  phone?: string;
  businessName?: string;
  address?: string;
  instagram?: string;
  facebook?: string;
  bookingUrl?: string;
};
