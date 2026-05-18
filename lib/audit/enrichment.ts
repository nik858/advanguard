import * as cheerio from "cheerio";
import type { Enrichment } from "@/types/audit";

const PHONE_RE = /\+?\d[\d\s().-]{6,18}\d/g;
const BOOKING_DOMAINS = [
  "calendly.com",
  "doctolib.fr",
  "doctolib.de",
  "doctolib.it",
  "square.site",
  "squareup.com",
  "mindbody.io",
  "vagaro.com",
  "bookingbug.com",
  "simplybook.it",
  "acuityscheduling.com",
  "setmore.com",
  "fresha.com",
  "booksy.com",
];

/**
 * Reads the same HTML the audit scraper sees and extracts a small set of
 * enrichment fields: phone number, business name, address, social handles,
 * booking URL. All fields are optional — anything not confidently extracted
 * is left out.
 */
export function parseEnrichment(html: string): Enrichment {
  const $ = cheerio.load(html);
  const enrichment: Enrichment = {};

  // ---- JSON-LD pass: trust schema.org Organization / LocalBusiness over heuristics
  const jsonldNodes: any[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html() || "");
      if (Array.isArray(json)) jsonldNodes.push(...json);
      else jsonldNodes.push(json);
    } catch { /* ignore malformed */ }
  });
  for (const node of jsonldNodes) {
    if (!node || typeof node !== "object") continue;
    const type = node["@type"];
    const types = Array.isArray(type) ? type : [type];
    const isOrgOrBusiness = types.some((t) =>
      typeof t === "string" && /Organization|LocalBusiness|Dentist|MedicalBusiness|HealthClub|BeautySalon|HealthAndBeautyBusiness/i.test(t),
    );
    if (!isOrgOrBusiness) continue;
    if (typeof node.name === "string" && !enrichment.businessName) enrichment.businessName = node.name.trim();
    if (typeof node.telephone === "string" && !enrichment.phone) enrichment.phone = node.telephone.trim();
    if (node.address && typeof node.address === "object" && !enrichment.address) {
      const a = node.address;
      const parts = [a.streetAddress, a.addressLocality, a.addressRegion, a.postalCode, a.addressCountry]
        .filter((p) => typeof p === "string" && p.length > 0);
      if (parts.length) enrichment.address = parts.join(", ");
    } else if (typeof node.address === "string" && !enrichment.address) {
      enrichment.address = node.address.trim();
    }
  }

  // ---- businessName fallback: <title>, cleaning common suffixes
  if (!enrichment.businessName) {
    const titleText = $("title").first().text().trim();
    if (titleText) {
      // Strip common " - Suffix" / " | Suffix" patterns
      const cleaned = titleText.split(/[|–-]/)[0].trim();
      if (cleaned.length > 1 && cleaned.length < 80) enrichment.businessName = cleaned;
    }
  }

  // ---- phone fallback: regex on body text. Take the first plausible match.
  if (!enrichment.phone) {
    const bodyText = $("body").text();
    const matches = bodyText.match(PHONE_RE) || [];
    for (const raw of matches) {
      const digits = raw.replace(/\D/g, "");
      if (digits.length >= 8 && digits.length <= 15) {
        enrichment.phone = raw.trim();
        break;
      }
    }
  }

  // ---- social profiles (instagram / facebook)
  $("a[href]").each((_, el) => {
    const href = ($(el).attr("href") || "").toLowerCase();
    if (!enrichment.instagram && /instagram\.com\/[^/?#]+/.test(href)) {
      const m = href.match(/instagram\.com\/([^/?#]+)/);
      if (m && m[1] && !["share", "p", "reel", "tv"].includes(m[1])) enrichment.instagram = `https://instagram.com/${m[1]}`;
    }
    if (!enrichment.facebook && /facebook\.com\/[^/?#]+/.test(href)) {
      const m = href.match(/facebook\.com\/([^/?#]+)/);
      if (m && m[1] && !["share", "sharer", "pages", "pg", "events", "groups"].includes(m[1])) enrichment.facebook = `https://facebook.com/${m[1]}`;
    }
    if (!enrichment.bookingUrl) {
      for (const domain of BOOKING_DOMAINS) {
        if (href.includes(domain)) {
          enrichment.bookingUrl = $(el).attr("href")?.trim();
          break;
        }
      }
    }
  });

  return enrichment;
}
