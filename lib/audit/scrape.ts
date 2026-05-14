import * as cheerio from "cheerio";
import type { HtmlSignals } from "@/types/audit";

const FETCH_TIMEOUT_MS = 10000;

/** Fetches a URL's HTML. Returns null on any failure (timeout, non-2xx, non-HTML). */
export async function fetchHtml(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "AdvanguardAuditBot/1.0 (+https://advanguard.vercel.app)" },
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text/html")) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function hasAny(haystack: string, needles: string[]): boolean {
  const lower = haystack.toLowerCase();
  return needles.some((n) => lower.includes(n));
}

/** Parses ~17 audit signals out of a homepage's HTML. Pure function — never throws. */
export function parseSignals(html: string, _url: string): HtmlSignals {
  const $ = cheerio.load(html);
  const scripts = $("script").map((_, el) => $(el).html() || "").get().join("\n")
    + " " + $("script[src]").map((_, el) => $(el).attr("src") || "").get().join(" ");
  const bodyText = $("body").text();
  const allHtml = html.toLowerCase();

  // Schema types from JSON-LD
  const schemaTypes: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html() || "");
      const nodes = Array.isArray(json) ? json : [json];
      for (const node of nodes) {
        const t = node && node["@type"];
        if (typeof t === "string") schemaTypes.push(t);
        else if (Array.isArray(t)) schemaTypes.push(...t.filter((x) => typeof x === "string"));
      }
    } catch { /* ignore malformed JSON-LD */ }
  });

  // Service page links: internal links whose href contains "/service" or "/services"
  const servicePageCount = new Set(
    $("a[href]")
      .map((_, el) => $(el).attr("href") || "")
      .get()
      .filter((href) => /\/services?\//i.test(href)),
  ).size;

  const titleText = $("title").first().text().trim();
  const descText = $('meta[name="description"]').attr("content")?.trim() || "";

  return {
    hasMetaPixel: hasAny(scripts, ["fbq(", "connect.facebook.net", "facebook pixel"]),
    hasGoogleAnalytics: hasAny(scripts, ["gtag(", "google-analytics.com", "googletagmanager.com", "ga('"]),
    hasGoogleAds: hasAny(scripts, ["googleadservices", "gtag/js?id=aw-", "google_conversion"]),
    hasBookingWidget: hasAny(allHtml, ["calendly", "acuityscheduling", "cal.com", "book an appointment", "schedule appointment", "réserver", "prendre rendez-vous"]),
    hasTestimonials: hasAny(allHtml, ["testimonial", "what our patients say", "what our clients say", "avis", "patient review"]),
    hasBeforeAfterGallery: hasAny(allHtml, ["before & after", "before &amp; after", "before and after", "before/after", "before-after", "beforeafter", "avant / après", "avant-après"]),
    hasFaq: hasAny(allHtml, ["frequently asked", "faq", "questions fréquentes"]),
    schemaTypes,
    hasLiveChat: hasAny(scripts, ["intercom", "drift.com", "tawk.to", "crisp.chat", "livechatinc", "tidio"]),
    hasHomepageVideo: $("video").length > 0 || hasAny(allHtml, ["youtube.com/embed", "player.vimeo.com", "wistia"]),
    hasPricingInfo: hasAny(bodyText, ["pricing", "$", "€", "£", "financing", "payment plan", "tarif"]),
    hasGoogleReviews: hasAny(allHtml, ["google reviews", "google-reviews", "g.page", "goo.gl/maps", "maps.google"]),
    hasTeamPage: $("a[href]").toArray().some((el) => /\/(team|doctors|staff|about|equipe|our-team)/i.test($(el).attr("href") || "")),
    isMultilingual: $("link[hreflang]").length > 0 || $('[class*="lang"], [id*="lang"]').length > 0,
    servicePageCount,
    hasViewportMeta: $('meta[name="viewport"]').length > 0,
    metaTitle: titleText.length > 0 ? titleText : null,
    metaDescription: descText.length > 0 ? descText : null,
    hasPhone: $('a[href^="tel:"]').length > 0 || /\+?\d[\d\s().-]{7,}\d/.test(bodyText),
    hasAddress: $("address").length > 0 || hasAny(bodyText, [" st,", " street", " ave,", " avenue", " blvd", " suite "]),
  };
}
