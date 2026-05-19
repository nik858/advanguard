// @vitest-environment node
import { describe, it, expect } from "vitest";
import { buildSignalsV2, formatSignalsV2ForPrompt } from "@/lib/audit/signals-v2";
import type { CrawledPage } from "@/lib/audit/crawler";

function makeCrawl(pages: { url: string; html: string; category: CrawledPage["category"] }[]) {
  const homepage = pages[0];
  return { homepage, pages };
}

function richHomepage(extra: string = ""): string {
  return `<!doctype html>
    <html><head>
      <title>Acme Dental</title>
      <script src="https://connect.facebook.net/en_US/fbevents.js"></script>
      <script>fbq('init', '123');</script>
      <script src="https://www.googletagmanager.com/gtag/js?id=AW-123"></script>
      <script src="https://www.googletagmanager.com/gtag/js?id=G-456"></script>
      <script src="https://widget.intercom.io/widget/abc"></script>
      <script type="application/ld+json">{"@type":"Dentist","name":"Acme"}</script>
    </head><body>
      <video src="hero.mp4"></video>
      <blockquote>"Best dentist ever!" — Jane Doe</blockquote>
      <blockquote>"Changed my life." — Bob Smith</blockquote>
      <blockquote>"Loved it." — Sue</blockquote>
      <blockquote>"Five stars." — Mike</blockquote>
      <blockquote>"Highly recommend." — Pat</blockquote>
      <p>Dr. Sarah Lee, DDS — 15 years of experience.</p>
      <img src="dr-sarah.jpg" alt="Dr. Sarah Lee" />
      <a href="https://calendly.com/acme/consult">Book online</a>
      <p>CareCredit financing available.</p>
      <h3>Do you accept insurance?</h3>
      <p>Yes.</p>
      <h3>What is the cost?</h3>
      <p>Starts at $999.</p>
      ${extra}
    </body></html>`;
}

function servicePageHtml(name: string): string {
  return `<html><head><title>${name}</title></head><body>
    <img src="/i1.jpg" alt="treatment 1" />
    <img src="/i2.jpg" alt="treatment 2" />
    <img src="/i3.jpg" alt="treatment 3" />
    <a href="https://calendly.com/acme/consult">Book a consultation</a>
    <p>From $1,200.</p>
  </body></html>`;
}

describe("buildSignalsV2", () => {
  it("detects tracking pass when all three are present", () => {
    const crawl = makeCrawl([{ url: "https://acme.com/", html: richHomepage(), category: "homepage" }]);
    const signals = buildSignalsV2(crawl, null, "https://acme.com/");
    expect(signals.tracking.meta_pixel).toBe(true);
    expect(signals.tracking.google_ads).toBe(true);
    expect(signals.tracking.google_analytics).toBe(true);
    expect(signals.tracking.missing).toEqual([]);
    expect(signals.tracking.pass).toBe(true);
  });

  it("reports specific missing trackers", () => {
    const html = `<html><head><script src="https://www.googletagmanager.com/gtag/js?id=G-1"></script></head><body></body></html>`;
    const crawl = makeCrawl([{ url: "https://x.com/", html, category: "homepage" }]);
    const signals = buildSignalsV2(crawl, null, "https://x.com/");
    expect(signals.tracking.missing).toContain("meta_pixel");
    expect(signals.tracking.missing).toContain("google_ads");
    expect(signals.tracking.pass).toBe(false);
  });

  it("detects live chat platform by source", () => {
    const html = `<html><head><script src="https://embed.tawk.to/abc/1"></script></head><body></body></html>`;
    const crawl = makeCrawl([{ url: "https://x.com/", html, category: "homepage" }]);
    const signals = buildSignalsV2(crawl, null, "https://x.com/");
    expect(signals.live_chat.platform).toBe("Tawk.to");
    expect(signals.live_chat.pass).toBe(true);
  });

  it("detects testimonials pass at >=5 on-site quotes", () => {
    const crawl = makeCrawl([{ url: "https://acme.com/", html: richHomepage(), category: "homepage" }]);
    const signals = buildSignalsV2(crawl, null, "https://acme.com/");
    expect(signals.testimonials.onsite_count).toBeGreaterThanOrEqual(5);
    expect(signals.testimonials.pass).toBe(true);
  });

  it("flags booking_homepage_only when service pages lack booking", () => {
    const homepageHtml = `<html><body><a href="https://calendly.com/x/y">Book online</a></body></html>`;
    const servicePageNoBooking = `<html><head><title>Implants</title></head><body><img src="a.jpg" alt="a"/><img src="b.jpg" alt="b"/><img src="c.jpg" alt="c"/></body></html>`;
    const crawl = makeCrawl([
      { url: "https://acme.com/", html: homepageHtml, category: "homepage" },
      { url: "https://acme.com/services/implants", html: servicePageNoBooking, category: "service" },
    ]);
    const signals = buildSignalsV2(crawl, null, "https://acme.com/");
    expect(signals.booking_widget.homepage).toBe(true);
    expect(signals.booking_widget.pass).toBe(false);
    expect(signals.booking_widget.booking_homepage_only).toBe(true);
    expect(signals.booking_widget.missing_pages).toContain("https://acme.com/services/implants");
  });

  it("passes booking when every service page has a widget", () => {
    const crawl = makeCrawl([
      { url: "https://acme.com/", html: richHomepage(), category: "homepage" },
      { url: "https://acme.com/services/implants", html: servicePageHtml("Implants"), category: "service" },
      { url: "https://acme.com/services/veneers", html: servicePageHtml("Veneers"), category: "service" },
    ]);
    const signals = buildSignalsV2(crawl, null, "https://acme.com/");
    expect(signals.booking_widget.pass).toBe(true);
    expect(signals.booking_widget.booking_homepage_only).toBe(false);
  });

  it("counts images per service page and reports per-page pass", () => {
    const crawl = makeCrawl([
      { url: "https://acme.com/", html: richHomepage(), category: "homepage" },
      { url: "https://acme.com/services/implants", html: servicePageHtml("Implants"), category: "service" },
    ]);
    const signals = buildSignalsV2(crawl, null, "https://acme.com/");
    expect(signals.images_per_service_page.pages[0].count).toBeGreaterThanOrEqual(3);
    expect(signals.images_per_service_page.pages[0].pass).toBe(true);
    expect(signals.images_per_service_page.pass).toBe(true);
  });

  it("detects pricing gated when 'contact for pricing' is present", () => {
    const html = `<html><body><h2>Implants</h2><p>Contact for pricing.</p></body></html>`;
    const crawl = makeCrawl([{ url: "https://x.com/", html, category: "homepage" }]);
    const signals = buildSignalsV2(crawl, null, "https://x.com/");
    expect(signals.pricing.gated).toBe(true);
    expect(signals.pricing.pass).toBe(false);
  });

  it("flags free_consult_offered without failing pricing", () => {
    const html = `<html><body>Implants from $1,200. Free consultation.</body></html>`;
    const crawl = makeCrawl([{ url: "https://x.com/", html, category: "homepage" }]);
    const signals = buildSignalsV2(crawl, null, "https://x.com/");
    expect(signals.pricing.free_consult_offered).toBe(true);
  });

  it("detects homepage video for an embedded YouTube iframe", () => {
    const html = `<html><body><iframe src="https://www.youtube.com/embed/xyz"></iframe></body></html>`;
    const crawl = makeCrawl([{ url: "https://x.com/", html, category: "homepage" }]);
    const signals = buildSignalsV2(crawl, null, "https://x.com/");
    expect(signals.homepage_video.pass).toBe(true);
  });

  it("detects LocalBusiness schema", () => {
    const html = `<html><head><script type="application/ld+json">{"@type":"Dentist","name":"X"}</script></head><body></body></html>`;
    const crawl = makeCrawl([{ url: "https://x.com/", html, category: "homepage" }]);
    const signals = buildSignalsV2(crawl, null, "https://x.com/");
    expect(signals.schema_local_business.pass).toBe(true);
    expect(signals.schema_local_business.types_found).toContain("Dentist");
  });

  it("detects financing partners by name", () => {
    const html = `<html><body><img alt="CareCredit financing"><p>We also accept Cigna and Delta Dental.</p></body></html>`;
    const crawl = makeCrawl([{ url: "https://x.com/", html, category: "homepage" }]);
    const signals = buildSignalsV2(crawl, null, "https://x.com/");
    expect(signals.financing_partners.pass).toBe(true);
    expect(signals.financing_partners.detected).toEqual(expect.arrayContaining(["carecredit", "cigna", "delta dental"]));
  });

  it("detects FAQ pass via H3 question structure", () => {
    const html = `<html><body><h3>What does it cost?</h3><p>A lot.</p><h3>Does it hurt?</h3><p>No.</p></body></html>`;
    const crawl = makeCrawl([{ url: "https://x.com/", html, category: "homepage" }]);
    const signals = buildSignalsV2(crawl, null, "https://x.com/");
    expect(signals.faq.pass).toBe(true);
  });

  it("ssl pass tied to https URL", () => {
    const crawl = makeCrawl([{ url: "https://x.com/", html: "<html></html>", category: "homepage" }]);
    expect(buildSignalsV2(crawl, null, "https://x.com/").ssl.pass).toBe(true);
    expect(buildSignalsV2(crawl, null, "http://x.com/").ssl.pass).toBe(false);
  });

  it("multilingual pass with hreflang link", () => {
    const html = `<html><head><link rel="alternate" hreflang="es" href="/es/"></head><body></body></html>`;
    const crawl = makeCrawl([{ url: "https://x.com/", html, category: "homepage" }]);
    const signals = buildSignalsV2(crawl, null, "https://x.com/");
    expect(signals.multilingual.pass).toBe(true);
  });

  it("page_speed pass at score >=70 and critical at <50", () => {
    const crawl = makeCrawl([{ url: "https://x.com/", html: "<html></html>", category: "homepage" }]);
    const pagespeed = {
      mobilePerformance: 42, desktopPerformance: null,
      lcp: null, cls: null, inp: null, fcp: null, tbt: null, speedIndex: null,
      seoScore: null, accessibilityScore: null, bestPracticesScore: null,
      opportunities: [], failedAudits: [], field: null,
      detectedPlatform: null, platformTips: [],
    };
    const signals = buildSignalsV2(crawl, pagespeed, "https://x.com/");
    expect(signals.page_speed.pass).toBe(false);
    expect(signals.page_speed.critical).toBe(true);
    expect(signals.mobile_responsive.pass).toBe(false);
    expect(signals.mobile_responsive.critical).toBe(true);
  });

  it("flags no_individual_service_pages for one mega homepage with 30+ images", () => {
    const imgs = Array.from({ length: 35 }, (_, i) => `<img src="/${i}.jpg" alt="content"/>`).join("");
    const html = `<html><body>${imgs}</body></html>`;
    const crawl = makeCrawl([{ url: "https://x.com/", html, category: "homepage" }]);
    const signals = buildSignalsV2(crawl, null, "https://x.com/");
    expect(signals.images_per_service_page.no_individual_service_pages).toBe(true);
    expect(signals.images_per_service_page.pass).toBe(false);
  });
});

describe("formatSignalsV2ForPrompt", () => {
  it("returns a string that mentions each signal section", () => {
    const crawl = makeCrawl([{ url: "https://acme.com/", html: richHomepage(), category: "homepage" }]);
    const signals = buildSignalsV2(crawl, null, "https://acme.com/");
    const formatted = formatSignalsV2ForPrompt(signals);
    expect(formatted).toContain("EMAIL 1 SIGNALS");
    expect(formatted).toContain("EMAIL 2 SIGNALS");
    expect(formatted).toContain("EMAIL 3 SIGNALS");
    expect(formatted).toContain("Meta Pixel");
    expect(formatted).toContain("PASS");
  });
});
