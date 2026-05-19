import * as cheerio from "cheerio";
import type { CrawlResult, CrawledPage } from "@/lib/audit/crawler";
import type { PageSpeedSignals, SignalsV2, TrackingMissing } from "@/types/audit";

const BA_MARKERS = [
  "before", "after", "before & after", "before and after", "before/after",
  "results", "case study", "transformation", "smile makeover", "patient case", "outcome",
];

const LIVE_CHAT_PROVIDERS: { name: string; needles: string[] }[] = [
  { name: "Intercom", needles: ["intercom.io", "widget.intercom.io"] },
  { name: "Drift", needles: ["drift.com", "js.driftt.com"] },
  { name: "Tawk.to", needles: ["tawk.to", "embed.tawk.to"] },
  { name: "Tidio", needles: ["tidio.com", "code.tidio.co"] },
  { name: "LiveChat", needles: ["livechatinc.com"] },
  { name: "Zendesk Chat", needles: ["zopim.com", "static.zdassets.com/ekr"] },
  { name: "HubSpot Chat", needles: ["js.hs-scripts.com", "js.hubspot.com", "hubspot-conversations"] },
  { name: "Crisp", needles: ["crisp.chat", "client.crisp.chat"] },
  { name: "Smartsupp", needles: ["smartsupp.com"] },
  { name: "Olark", needles: ["olark.com"] },
  { name: "Facebook Customer Chat", needles: ["connect.facebook.net/en_US/sdk/xfbml.customerchat"] },
  { name: "ManyChat", needles: ["manychat.com"] },
  { name: "Chatra", needles: ["chatra.io", "call.chatra.io"] },
  { name: "JivoChat", needles: ["jivo.chat", "code.jivosite.com"] },
];

const BOOKING_WIDGETS: { needles: string[] }[] = [
  { needles: ["calendly.com"] },
  { needles: ["acuityscheduling.com", "app.acuityscheduling.com"] },
  { needles: ["nexhealth.com"] },
  { needles: ["simplybook.it", "simplybook.me"] },
  { needles: ["localmed.com"] },
  { needles: ["squareup.com/appointments", "square.site"] },
  { needles: ["zocdoc.com"] },
  { needles: ["doctolib.fr", "doctolib.de", "doctolib.it"] },
  { needles: ["mindbody.io", "mindbodyonline.com"] },
  { needles: ["setmore.com"] },
  { needles: ["fresha.com"] },
  { needles: ["booksy.com"] },
  { needles: ["vagaro.com"] },
  { needles: ["bookingbug.com"] },
];

const BOOKING_BUTTON_KEYWORDS = [
  "book online", "book a consultation", "schedule appointment", "book now",
  "schedule a consultation", "book your consultation", "book an appointment",
  "réserver", "prendre rendez-vous",
];

const FINANCING_PARTNERS = [
  "carecredit", "lendingclub", "sunbit", "cherry", "proceed finance",
  "affirm", "klarna", "splitit",
  "delta dental", "cigna", "aetna", "bcbs", "blue cross", "metlife",
  "humana", "unitedhealthcare", "united healthcare",
];

const PRICING_GATED_PHRASES = [
  "contact for pricing", "call for pricing", "pricing available upon consultation",
  "pricing available on request", "request a quote", "contact us for pricing",
];

const FREE_CONSULT_PHRASES = [
  "free consultation", "complimentary consultation", "no-cost consultation", "free consult",
];

const CREDENTIAL_KEYWORDS = [
  /\b(DDS|DMD|MD|BDS|MBBS|DO|RN|NP|PA|DPM|FACS)\b/,
  /\b(\d+)\s*\+?\s*years?\s+of\s+experience\b/i,
  /\bgraduated\s+from\b/i,
  /\beducation\b.*\buniversity\b/i,
  /\bboard[\s-]certified\b/i,
];

const SCHEMA_LB_TYPES = [
  "LocalBusiness", "MedicalBusiness", "MedicalClinic", "Dentist",
  "MedicalSpa", "HealthClub", "DentistOffice", "Physician",
];

const LANG_PATH_PREFIXES = ["/es/", "/zh/", "/vi/", "/pt/", "/ru/", "/fr/", "/de/", "/it/", "/ar/", "/ja/", "/ko/"];

function lowerAll(s: string | undefined | null): string {
  return (s || "").toLowerCase();
}

function combinedSourceForScripts($: cheerio.CheerioAPI): string {
  const inline = $("script").map((_, el) => $(el).html() || "").get().join("\n");
  const srcs = $("script[src]").map((_, el) => $(el).attr("src") || "").get().join(" ");
  return `${inline}\n${srcs}`.toLowerCase();
}

function detectTrackingInScripts(scripts: string): { meta_pixel: boolean; google_ads: boolean; google_analytics: boolean } {
  const meta_pixel = scripts.includes("fbq(") || scripts.includes("connect.facebook.net/en_us/fbevents.js");
  const google_ads = /googletagmanager\.com\/gtag\/js\?id=aw-/i.test(scripts) || /gtag\([^)]*['"]aw-/i.test(scripts) || scripts.includes("googleadservices");
  const google_analytics = /googletagmanager\.com\/gtag\/js\?id=g-/i.test(scripts) || /\bua-\d{4,}/i.test(scripts) || scripts.includes("google-analytics.com");
  return { meta_pixel, google_ads, google_analytics };
}

function detectLiveChat(scripts: string): string | null {
  for (const provider of LIVE_CHAT_PROVIDERS) {
    if (provider.needles.some((n) => scripts.includes(n))) return provider.name;
  }
  return null;
}

function detectHomepageVideo($: cheerio.CheerioAPI, htmlLower: string): boolean {
  if ($("video").length > 0) return true;
  if (htmlLower.includes("youtube.com/embed") || htmlLower.includes("youtu.be/")) return true;
  if (htmlLower.includes("player.vimeo.com")) return true;
  if (htmlLower.includes("wistia") && htmlLower.includes("embed")) return true;
  if (htmlLower.includes("jwplayer") || htmlLower.includes("jw-player")) return true;
  return false;
}

function detectFaq($: cheerio.CheerioAPI, htmlLower: string, page: CrawledPage): boolean {
  if (page.category === "faq") return true;
  // FAQPage JSON-LD
  let hasFaqSchema = false;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (hasFaqSchema) return;
    try {
      const json = JSON.parse($(el).html() || "");
      const nodes = Array.isArray(json) ? json : [json];
      for (const node of nodes) {
        if (!node || typeof node !== "object") continue;
        const t = node["@type"];
        const types = Array.isArray(t) ? t : [t];
        if (types.some((x) => typeof x === "string" && x.toLowerCase() === "faqpage")) {
          hasFaqSchema = true;
          return;
        }
      }
    } catch { /* ignore */ }
  });
  if (hasFaqSchema) return true;
  // H3/H4 ending in ? — count a few to filter spurious matches
  let questionLike = 0;
  $("h3, h4").each((_, el) => {
    const text = $(el).text().trim();
    if (/[?？]\s*$/.test(text)) questionLike += 1;
  });
  if (questionLike >= 2) return true;
  // Generic "FAQ" sections
  if (htmlLower.includes("frequently asked questions") || htmlLower.includes(">faq<")) return true;
  return false;
}

function detectSchemaLocalBusiness($: cheerio.CheerioAPI): string[] {
  const found = new Set<string>();
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html() || "");
      const nodes = Array.isArray(json) ? json : [json];
      for (const node of nodes) {
        if (!node || typeof node !== "object") continue;
        const t = node["@type"];
        const types = Array.isArray(t) ? t : [t];
        for (const type of types) {
          if (typeof type === "string" && SCHEMA_LB_TYPES.some((tt) => type.toLowerCase() === tt.toLowerCase())) {
            found.add(type);
          }
        }
      }
    } catch { /* ignore */ }
  });
  // Microdata fallback: itemtype URLs
  $("[itemtype]").each((_, el) => {
    const itemtype = $(el).attr("itemtype") || "";
    for (const tt of SCHEMA_LB_TYPES) {
      if (itemtype.toLowerCase().includes(tt.toLowerCase())) found.add(tt);
    }
  });
  return [...found];
}

function detectMultilingual($: cheerio.CheerioAPI, url: string, htmlLower: string): boolean {
  if ($("link[hreflang]").length > 0) return true;
  // Language toggles in nav
  const langToggle = $('[class*="lang-switcher" i], [class*="language-switcher" i], [id*="lang-switcher" i], [aria-label*="language" i]').length > 0;
  if (langToggle) return true;
  // URL prefixes for the page itself or any link
  try {
    const path = new URL(url).pathname.toLowerCase();
    if (LANG_PATH_PREFIXES.some((p) => path.startsWith(p))) return true;
  } catch { /* ignore */ }
  let anyLangLink = false;
  $("a[href]").each((_, el) => {
    if (anyLangLink) return;
    const href = ($(el).attr("href") || "").toLowerCase();
    if (LANG_PATH_PREFIXES.some((p) => href.includes(p))) anyLangLink = true;
  });
  if (anyLangLink) return true;
  // Lazy fallback: explicit "Español"/"Français"/"中文" mentions in a switcher-ish context
  if (/(\bespañol\b|\bfrançais\b|中文|\bdeutsch\b)/i.test(htmlLower)) return true;
  return false;
}

function imageMarkerHit(text: string): boolean {
  const lower = text.toLowerCase();
  return BA_MARKERS.some((m) => lower.includes(m));
}

function countBeforeAfterOnPage($: cheerio.CheerioAPI): number {
  // Pass 1: composite single images marked B/A
  let composites = 0;
  // Pass 2: pairs identified by filename + sibling-proximity
  const beforeFiles = new Map<string, true>();
  const afterFiles = new Map<string, true>();
  $("img").each((_, el) => {
    const $el = $(el);
    const alt = $el.attr("alt") || "";
    const src = $el.attr("src") || $el.attr("data-src") || "";
    const filename = src.split("/").pop() || "";
    const caption = $el.parent().text().slice(0, 200);
    const surroundingContext = `${alt} ${filename} ${caption}`;
    const beforeHit = /\bbefore\b/i.test(surroundingContext);
    const afterHit = /\bafter\b/i.test(surroundingContext);
    const compositeHit = imageMarkerHit(surroundingContext) && !(beforeHit !== afterHit);
    if (beforeHit && !afterHit) {
      const key = filename.replace(/before[-_]?/i, "").replace(/[-_]?before/i, "");
      beforeFiles.set(key || filename, true);
    } else if (afterHit && !beforeHit) {
      const key = filename.replace(/after[-_]?/i, "").replace(/[-_]?after/i, "");
      afterFiles.set(key || filename, true);
    } else if (compositeHit && imageMarkerHit(surroundingContext)) {
      composites += 1;
    }
  });
  // Pair count = min over matching keys
  let pairs = 0;
  for (const key of beforeFiles.keys()) {
    if (afterFiles.has(key)) pairs += 1;
  }
  // Fallback: if we have both buckets but no filename matches, take the min
  if (pairs === 0 && beforeFiles.size > 0 && afterFiles.size > 0) {
    pairs = Math.min(beforeFiles.size, afterFiles.size);
  }
  return composites + pairs;
}

function countTestimonialsOnPage($: cheerio.CheerioAPI, htmlLower: string, page: CrawledPage): number {
  let count = 0;
  // Blockquotes — any non-trivial one counts
  $("blockquote").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length >= 10) count += 1;
  });
  // Structured "testimonial" containers
  $('[class*="testimonial" i], [data-testimonial], [class*="review" i]').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length >= 10) count += 1;
  });
  // Page is dedicated to testimonials/reviews → count generously
  if (page.category === "testimonials" && count === 0) {
    // Sometimes the structure is loose. Look for repeated quote-styled content.
    const quotes = (htmlLower.match(/&ldquo;|&rdquo;|“|”/g) || []).length;
    if (quotes >= 10) count += Math.floor(quotes / 4); // rough heuristic
  }
  return count;
}

function detectBookingOnPage($: cheerio.CheerioAPI, htmlLower: string): boolean {
  for (const widget of BOOKING_WIDGETS) {
    if (widget.needles.some((n) => htmlLower.includes(n))) return true;
  }
  // Iframes pointing at booking domains
  let foundIframeBooking = false;
  $("iframe[src]").each((_, el) => {
    if (foundIframeBooking) return;
    const src = ($(el).attr("src") || "").toLowerCase();
    if (BOOKING_WIDGETS.some((w) => w.needles.some((n) => src.includes(n)))) foundIframeBooking = true;
  });
  if (foundIframeBooking) return true;
  // Buttons / anchors labelled like booking, linking to a non-mailto / non-contact URL
  let foundBtn = false;
  $("a[href], button").each((_, el) => {
    if (foundBtn) return;
    const text = $(el).text().trim().toLowerCase();
    if (!BOOKING_BUTTON_KEYWORDS.some((kw) => text.includes(kw))) return;
    if (el.tagName === "a") {
      const href = ($(el).attr("href") || "").toLowerCase();
      if (!href || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      if (/\/contact(\b|\/|\?|#)/.test(href) && !BOOKING_WIDGETS.some((w) => w.needles.some((n) => href.includes(n)))) return;
    }
    foundBtn = true;
  });
  return foundBtn;
}

function detectPricingOnPage($: cheerio.CheerioAPI, htmlLower: string): { hasPricing: boolean; gated: boolean; freeConsult: boolean } {
  const bodyText = $("body").text();
  // Strip $ in code / JSON-LD context by sampling reasonable amounts
  const dollarPrice = /\$\s?\d/.test(bodyText);
  const fromPrice = /\bfrom\s+\$?\s?\d/i.test(bodyText) || /\bstarting at\s*\$?\s?\d/i.test(bodyText);
  const monthly = /\$\s?\d+\s*\/\s*month/i.test(bodyText) || /\bas low as\s+\$\s?\d/i.test(bodyText);
  const apr = /\b0%\s*apr\b/i.test(bodyText) || /\bmonthly payments? from\b/i.test(bodyText);
  const hasPricing = dollarPrice || fromPrice || monthly || apr;
  const gated = PRICING_GATED_PHRASES.some((p) => htmlLower.includes(p));
  const freeConsult = FREE_CONSULT_PHRASES.some((p) => htmlLower.includes(p));
  return { hasPricing, gated, freeConsult };
}

function countContentImagesOnPage($: cheerio.CheerioAPI): number {
  let count = 0;
  $("img").each((_, el) => {
    const $el = $(el);
    const src = $el.attr("src") || $el.attr("data-src") || "";
    const alt = ($el.attr("alt") || "").toLowerCase();
    const cls = ($el.attr("class") || "").toLowerCase();
    if (!src) return;
    // Exclude logos, icons, decorative
    if (/logo|icon|favicon|sprite|chevron|arrow|caret/i.test(alt + " " + cls + " " + src)) return;
    if (src.startsWith("data:")) return;
    // Tiny declared sizes
    const w = parseInt($el.attr("width") || "0", 10);
    const h = parseInt($el.attr("height") || "0", 10);
    if (w > 0 && h > 0 && w < 50 && h < 50) return;
    count += 1;
  });
  return count;
}

function detectTeamCredentials(page: CrawledPage): { named: boolean; photo: boolean; credential: boolean } {
  const $ = cheerio.load(page.html);
  const text = $("body").text();
  // Crude named-individual: capitalised First Last pairs (avoiding ALL CAPS headlines)
  const namedMatch = text.match(/\b(Dr\.?\s+)?[A-Z][a-z]+\s+[A-Z][a-z]+\b/);
  const named = !!namedMatch;
  // Photo: at least one <img> in a section with a name-ish label
  let photo = false;
  if (named) {
    $("img").each((_, el) => {
      if (photo) return;
      const $el = $(el);
      const alt = $el.attr("alt") || "";
      const parentText = $el.closest("section, article, div, li").text();
      if (/Dr\.?\s+[A-Z][a-z]+/.test(alt) || /Dr\.?\s+[A-Z][a-z]+/.test(parentText)) photo = true;
    });
    // Looser fallback: any img inside the page (acceptable on team pages)
    if (!photo && (page.category === "team" || page.category === "homepage")) {
      photo = $("img").length > 0;
    }
  }
  const credential = CREDENTIAL_KEYWORDS.some((re) => re.test(text));
  return { named, photo, credential };
}

function detectFinancingOnPage(htmlLower: string): string[] {
  const found = new Set<string>();
  for (const partner of FINANCING_PARTNERS) {
    if (htmlLower.includes(partner)) found.add(partner);
  }
  return [...found];
}

/**
 * Builds the SignalsV2 structure from a multi-page crawl. Pure function over
 * already-fetched HTML — never throws.
 */
export function buildSignalsV2(
  crawl: CrawlResult,
  pagespeed: PageSpeedSignals | null,
  finalUrl: string,
): SignalsV2 {
  const servicePages = crawl.pages.filter((p) => p.category === "service");
  const servicePageUrls = servicePages.map((p) => p.url);

  // Pre-compute per-page bundles
  const perPage = crawl.pages.map((p) => {
    const $ = cheerio.load(p.html);
    const htmlLower = p.html.toLowerCase();
    return { page: p, $, htmlLower };
  });

  // Aggregate before/after across all pages
  const baCount = perPage.reduce((acc, { $ }) => acc + countBeforeAfterOnPage($), 0);

  // Booking
  const homepageBundle = perPage.find((b) => b.page.category === "homepage");
  const bookingHomepage = homepageBundle ? detectBookingOnPage(homepageBundle.$, homepageBundle.htmlLower) : false;
  const bookingServicePages = perPage
    .filter((b) => b.page.category === "service")
    .map((b) => ({ url: b.page.url, pass: detectBookingOnPage(b.$, b.htmlLower) }));
  const allServicePass = bookingServicePages.length > 0 && bookingServicePages.every((s) => s.pass);
  const bookingPass = allServicePass; // strict per brief
  const missingServicePages = bookingServicePages.filter((s) => !s.pass).map((s) => s.url);
  const bookingHomepageOnly = bookingHomepage && !allServicePass;

  // Testimonials (on-site)
  const testimonialCount = perPage.reduce((acc, { $, htmlLower, page }) => acc + countTestimonialsOnPage($, htmlLower, page), 0);

  // Live chat: scan scripts across all pages but the homepage is usually enough
  let chatPlatform: string | null = null;
  for (const b of perPage) {
    const scripts = combinedSourceForScripts(b.$);
    const found = detectLiveChat(scripts);
    if (found) {
      chatPlatform = found;
      break;
    }
  }

  // Tracking: scan all pages; tracker may be installed only on certain templates
  const tracking = perPage.reduce(
    (acc, b) => {
      const scripts = combinedSourceForScripts(b.$);
      const t = detectTrackingInScripts(scripts);
      return {
        meta_pixel: acc.meta_pixel || t.meta_pixel,
        google_ads: acc.google_ads || t.google_ads,
        google_analytics: acc.google_analytics || t.google_analytics,
      };
    },
    { meta_pixel: false, google_ads: false, google_analytics: false },
  );
  const missing: TrackingMissing[] = [];
  if (!tracking.meta_pixel) missing.push("meta_pixel");
  if (!tracking.google_ads) missing.push("google_ads");
  if (!tracking.google_analytics) missing.push("google_analytics");

  // Images per service page
  const imageCounts = perPage
    .filter((b) => b.page.category === "service")
    .map((b) => ({ url: b.page.url, count: countContentImagesOnPage(b.$), pass: false }));
  for (const ic of imageCounts) ic.pass = ic.count >= 3;
  const imagesPass = imageCounts.length > 0 && imageCounts.every((ic) => ic.pass);

  // Single mega-page detection: no service pages and homepage has 30+ images
  const homepageContentImages = homepageBundle ? countContentImagesOnPage(homepageBundle.$) : 0;
  const noIndividualServicePages = servicePages.length === 0 && homepageContentImages >= 30;

  // Pricing
  const pricingAcc = perPage.reduce(
    (acc, { $, htmlLower, page }) => {
      // Only weigh service pages + homepage for pricing detection (avoid /privacy etc)
      if (!(page.category === "service" || page.category === "homepage")) return acc;
      const r = detectPricingOnPage($, htmlLower);
      return {
        hasPricing: acc.hasPricing || r.hasPricing,
        gated: acc.gated || r.gated,
        freeConsult: acc.freeConsult || r.freeConsult,
      };
    },
    { hasPricing: false, gated: false, freeConsult: false },
  );
  const pricingPass = pricingAcc.hasPricing && !pricingAcc.gated;

  // Homepage video
  const homepageVideo = homepageBundle ? detectHomepageVideo(homepageBundle.$, homepageBundle.htmlLower) : false;

  // PageSpeed-derived signals
  const mobileScore = pagespeed?.mobilePerformance ?? null;
  const mobilePass = mobileScore !== null && mobileScore >= 70;
  const mobileCritical = mobileScore !== null && mobileScore < 50;

  // Team / credentials
  const teamPage = crawl.pages.find((p) => p.category === "team") ?? crawl.pages.find((p) => p.category === "homepage")!;
  const team = detectTeamCredentials(teamPage);
  const teamPass = team.named && team.photo && team.credential;

  // SSL
  const sslPass = finalUrl.startsWith("https://");

  // Schema LocalBusiness: scan homepage primarily
  const schemaTypes = homepageBundle ? detectSchemaLocalBusiness(homepageBundle.$) : [];
  const schemaPass = schemaTypes.length > 0;

  // Multilingual
  const isMultilingual = homepageBundle
    ? detectMultilingual(homepageBundle.$, homepageBundle.page.url, homepageBundle.htmlLower)
    : false;

  // Financing partners: scan all pages
  const financingSet = new Set<string>();
  for (const b of perPage) {
    for (const partner of detectFinancingOnPage(b.htmlLower)) financingSet.add(partner);
  }

  // FAQ
  const faqPass = perPage.some(({ $, htmlLower, page }) => detectFaq($, htmlLower, page));

  return {
    url: finalUrl,
    is_https: sslPass,
    pages_crawled: crawl.pages.length,
    service_page_urls: servicePageUrls,

    before_after: { case_count: baCount, pass: baCount >= 10 },
    booking_widget: {
      homepage: bookingHomepage,
      service_pages: bookingServicePages,
      pass: bookingPass,
      booking_homepage_only: bookingHomepageOnly,
      missing_pages: missingServicePages,
    },
    testimonials: { onsite_count: testimonialCount, pass: testimonialCount >= 5 },
    live_chat: { platform: chatPlatform, pass: chatPlatform !== null },
    mobile_responsive: { score: mobileScore, pass: mobilePass, critical: mobileCritical },
    tracking: {
      ...tracking,
      missing,
      pass: missing.length === 0,
    },

    images_per_service_page: {
      pages: imageCounts,
      pass: imagesPass,
      no_individual_service_pages: noIndividualServicePages,
    },
    pricing: { pass: pricingPass, gated: pricingAcc.gated, free_consult_offered: pricingAcc.freeConsult },
    homepage_video: { pass: homepageVideo },
    page_speed: { score: mobileScore, pass: mobilePass, critical: mobileCritical },

    team_credentials: {
      has_named_provider: team.named,
      has_photo: team.photo,
      has_credential: team.credential,
      pass: teamPass,
    },
    ssl: { pass: sslPass },
    schema_local_business: { pass: schemaPass, types_found: schemaTypes },
    multilingual: { pass: isMultilingual },
    financing_partners: { detected: [...financingSet], pass: financingSet.size > 0 },
    faq: { pass: faqPass },
  };
}

function passLabel(pass: boolean): string {
  return pass ? "PASS" : "FAIL";
}

/** Renders SignalsV2 as a human-readable block Claude can reason over. */
export function formatSignalsV2ForPrompt(s: SignalsV2): string {
  const lines: string[] = [
    `Website audited: ${s.url}`,
    `HTTPS / SSL: ${s.is_https ? "yes" : "no"}`,
    `Pages crawled: ${s.pages_crawled}`,
    `Service pages found (${s.service_page_urls.length}): ${s.service_page_urls.join(", ") || "none"}`,
    ``,
    `=== EMAIL 1 SIGNALS (credibility / trust) ===`,
    `1. Before/after gallery: ${passLabel(s.before_after.pass)} — ${s.before_after.case_count} cases detected site-wide (threshold ≥10).`,
    `2. Online booking widget: ${passLabel(s.booking_widget.pass)}.`,
    `   Homepage has booking: ${s.booking_widget.homepage ? "yes" : "no"}.`,
    `   Service pages with booking: ${s.booking_widget.service_pages.filter((p) => p.pass).length}/${s.booking_widget.service_pages.length}.`,
    s.booking_widget.booking_homepage_only ? `   ⚠ Booking widget is on homepage ONLY — missing from service pages: ${s.booking_widget.missing_pages.join(", ")}.` : ``,
    `3. On-site testimonials: ${passLabel(s.testimonials.pass)} — ${s.testimonials.onsite_count} detected (threshold ≥5).`,
    `4. Live chat / chatbot: ${passLabel(s.live_chat.pass)}${s.live_chat.platform ? ` (${s.live_chat.platform})` : ""}.`,
    `5. Mobile responsive (PageSpeed): ${passLabel(s.mobile_responsive.pass)} — score ${s.mobile_responsive.score ?? "n/a"}/100${s.mobile_responsive.critical ? " 🚨 CRITICAL" : ""}.`,
    `6. Tracking (Meta Pixel + Google Ads + Google Analytics): ${passLabel(s.tracking.pass)}.`,
    `   Meta Pixel: ${s.tracking.meta_pixel ? "yes" : "MISSING"}.`,
    `   Google Ads: ${s.tracking.google_ads ? "yes" : "MISSING"}.`,
    `   Google Analytics: ${s.tracking.google_analytics ? "yes" : "MISSING"}.`,
    s.tracking.missing.length > 0 ? `   Missing: ${s.tracking.missing.join(", ")}.` : ``,
    ``,
    `=== EMAIL 2 SIGNALS (funnel / conversion) ===`,
    `7. Image count per service page: ${passLabel(s.images_per_service_page.pass)} (threshold ≥3 per service page; pass requires all).`,
    ...s.images_per_service_page.pages.map((p) => `   - ${p.url}: ${p.count} images (${passLabel(p.pass)}).`),
    s.images_per_service_page.no_individual_service_pages ? `   ⚠ No individual service pages — all content on one homepage (≥30 images).` : ``,
    `8. Pricing visible on service pages: ${passLabel(s.pricing.pass)}.`,
    s.pricing.gated ? `   ⚠ Pricing gated: site says 'contact for pricing' or equivalent.` : ``,
    s.pricing.free_consult_offered ? `   ✓ Free consultation offered (bonus content angle).` : ``,
    `9. Homepage video: ${passLabel(s.homepage_video.pass)}.`,
    `10. Page speed (mobile): ${passLabel(s.page_speed.pass)} — score ${s.page_speed.score ?? "n/a"}/100${s.page_speed.critical ? " 🚨 CRITICAL" : ""}.`,
    ``,
    `=== EMAIL 3 SIGNALS (authority / trust) ===`,
    `11. Team / doctor credentials: ${passLabel(s.team_credentials.pass)} — named provider: ${s.team_credentials.has_named_provider}, photo: ${s.team_credentials.has_photo}, credential listed: ${s.team_credentials.has_credential}.`,
    `12. SSL: ${passLabel(s.ssl.pass)}.`,
    `13. LocalBusiness schema: ${passLabel(s.schema_local_business.pass)}${s.schema_local_business.types_found.length ? ` (${s.schema_local_business.types_found.join(", ")})` : ""}.`,
    `14. Multilingual support: ${passLabel(s.multilingual.pass)}.`,
    `15. Financing / insurance partners: ${passLabel(s.financing_partners.pass)}${s.financing_partners.detected.length ? ` — detected: ${s.financing_partners.detected.join(", ")}` : ""}.`,
    `16. FAQ section: ${passLabel(s.faq.pass)}.`,
  ];
  return lines.filter((l) => l !== "").join("\n");
}
