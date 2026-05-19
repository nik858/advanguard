import * as cheerio from "cheerio";
import { fetchHtml } from "@/lib/audit/scrape";

export type PageCategory = "homepage" | "service" | "team" | "faq" | "testimonials" | "other";

export type CrawledPage = {
  url: string;
  html: string;
  category: PageCategory;
};

export type CrawlResult = {
  homepage: CrawledPage;
  pages: CrawledPage[]; // includes the homepage as the first entry
};

const MAX_PAGES = 20;
const FETCH_CONCURRENCY = 4;

const SERVICE_KEYWORDS = [
  "implant", "all-on-4", "all-on-6", "all-on-x", "full-arch",
  "smile-makeover", "smile-design", "veneer", "crown", "bridge", "denture",
  "botox", "filler", "dysport", "lift", "rhinoplasty", "lipo", "body-contouring",
  "laser", "peel", "microneedling", "prp", "hair-restoration", "transplant",
  "treatment", "service", "procedure", "therapy", "consultation",
];

const TEAM_PATHS = ["/team", "/about", "/our-doctors", "/our-team", "/staff", "/providers", "/meet-the-team", "/doctors", "/equipe"];
const FAQ_PATHS = ["/faq", "/questions", "/q-and-a", "/qa"];
const TESTIMONIAL_PATHS = ["/testimonial", "/review"];

const EXCLUDED_PATTERNS: RegExp[] = [
  /\/blog(\/|$)/i,
  /\/news(\/|$)/i,
  /\/post(s)?(\/|$)/i,
  /\/article(s)?(\/|$)/i,
  /\/category(\/|$)/i,
  /\/tag(\/|$)/i,
  /\/author(\/|$)/i,
  /\/wp-(admin|login|content)/i,
  /\.(jpg|jpeg|png|gif|webp|svg|pdf|zip|mp4|webm|mov|css|js|xml|json)$/i,
  /^\/\d{4}\/\d{2}\//, // date-prefixed slugs
];

function normalizeUrl(input: string, baseHost: string): URL | null {
  try {
    const u = new URL(input, `https://${baseHost}`);
    if (u.host.toLowerCase() !== baseHost.toLowerCase()) return null;
    u.hash = "";
    if (u.pathname.length > 1 && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u;
  } catch {
    return null;
  }
}

function isExcluded(pathname: string): boolean {
  return EXCLUDED_PATTERNS.some((re) => re.test(pathname));
}

export function classifyPage(url: string, title: string, isHomepage: boolean): PageCategory {
  if (isHomepage) return "homepage";
  let path: string;
  try {
    path = new URL(url).pathname.toLowerCase();
  } catch {
    path = url.toLowerCase();
  }
  const titleLower = title.toLowerCase();
  const haystack = `${path} ${titleLower}`;
  if (FAQ_PATHS.some((p) => path.includes(p)) || titleLower.includes("faq")) return "faq";
  if (TESTIMONIAL_PATHS.some((p) => path.includes(p))) return "testimonials";
  if (TEAM_PATHS.some((p) => path.includes(p))) return "team";
  for (const kw of SERVICE_KEYWORDS) {
    if (haystack.includes(kw)) return "service";
  }
  return "other";
}

async function fetchSitemapUrls(baseHost: string): Promise<string[] | null> {
  const tries = [
    `https://${baseHost}/sitemap.xml`,
    `https://${baseHost}/sitemap_index.xml`,
  ];
  for (const url of tries) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "user-agent": "AdvanguardAuditBot/1.0 (+https://advanguard.vercel.app)" },
      }).finally(() => clearTimeout(timer));
      if (!res.ok) continue;
      const xml = await res.text();
      const urls = parseSitemapXml(xml);
      if (urls.length > 0) return urls;
    } catch {
      // try next
    }
  }
  return null;
}

/** Parses a sitemap or sitemap-index XML into a flat list of <loc> URLs. Pure. */
export function parseSitemapXml(xml: string): string[] {
  const out: string[] = [];
  for (const match of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
    out.push(match[1]);
  }
  return out;
}

function linksFromHomepage(homepageHtml: string, baseHost: string): string[] {
  const $ = cheerio.load(homepageHtml);
  const found: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    const u = normalizeUrl(href, baseHost);
    if (!u) return;
    if (isExcluded(u.pathname)) return;
    found.push(u.toString());
  });
  return [...new Set(found)];
}

async function fetchAll(urls: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  let cursor = 0;
  async function worker() {
    while (cursor < urls.length) {
      const idx = cursor++;
      const url = urls[idx];
      const html = await fetchHtml(url);
      if (html) out.set(url, html);
    }
  }
  const workers = Array.from({ length: Math.min(FETCH_CONCURRENCY, urls.length) }, () => worker());
  await Promise.all(workers);
  return out;
}

/**
 * Crawls a site for audit purposes. Always starts from the homepage HTML the
 * caller already has. Tries the sitemap first, falls back to the homepage's
 * link graph. Returns up to MAX_PAGES pages, classified by URL/title.
 *
 * Never throws — on any failure, returns at minimum `{ homepage, pages: [homepage] }`.
 */
export async function crawlSite(homepageUrl: string, homepageHtml: string): Promise<CrawlResult> {
  let host: string;
  try {
    host = new URL(homepageUrl).host;
  } catch {
    const homepage: CrawledPage = { url: homepageUrl, html: homepageHtml, category: "homepage" };
    return { homepage, pages: [homepage] };
  }

  // 1. Discover candidate URLs
  let candidates: string[] = [];
  const fromSitemap = await fetchSitemapUrls(host);
  if (fromSitemap && fromSitemap.length > 0) {
    candidates = fromSitemap
      .map((u) => normalizeUrl(u, host))
      .filter((u): u is URL => u !== null)
      .filter((u) => !isExcluded(u.pathname))
      .map((u) => u.toString());
  } else {
    candidates = linksFromHomepage(homepageHtml, host);
  }

  // Dedupe and drop the homepage itself
  const homepageNormalized = (() => {
    const u = normalizeUrl(homepageUrl, host);
    return u ? u.toString() : homepageUrl;
  })();
  const seen = new Set<string>([homepageNormalized]);
  const uniq: string[] = [];
  for (const c of candidates) {
    if (seen.has(c)) continue;
    seen.add(c);
    uniq.push(c);
  }

  // 2. Prioritise service / team / faq / testimonials URLs before generic ones
  function priority(url: string): number {
    const path = (() => {
      try {
        return new URL(url).pathname.toLowerCase();
      } catch {
        return url.toLowerCase();
      }
    })();
    if (SERVICE_KEYWORDS.some((kw) => path.includes(kw))) return 0;
    if (TEAM_PATHS.some((p) => path.includes(p))) return 1;
    if (FAQ_PATHS.some((p) => path.includes(p))) return 2;
    if (TESTIMONIAL_PATHS.some((p) => path.includes(p))) return 3;
    return 4;
  }
  uniq.sort((a, b) => priority(a) - priority(b));
  const toFetch = uniq.slice(0, MAX_PAGES - 1);

  // 3. Fetch
  const fetched = await fetchAll(toFetch);

  // 4. Classify
  const homepage: CrawledPage = {
    url: homepageNormalized,
    html: homepageHtml,
    category: "homepage",
  };
  const pages: CrawledPage[] = [homepage];
  for (const url of toFetch) {
    const html = fetched.get(url);
    if (!html) continue;
    const $ = cheerio.load(html);
    const title = $("title").first().text().trim();
    const category = classifyPage(url, title, false);
    pages.push({ url, html, category });
  }
  return { homepage, pages };
}
