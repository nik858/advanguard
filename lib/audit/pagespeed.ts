import type { PageSpeedSignals } from "@/types/audit";

const PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const PSI_TIMEOUT_MS = 30000;

type Strategy = "mobile" | "desktop";

async function runOne(url: string, strategy: Strategy): Promise<{
  performance: number | null;
  seo: number | null;
  accessibility: number | null;
  lcp: number | null;
  cls: number | null;
  inp: number | null;
} | null> {
  const params = new URLSearchParams({ url, strategy });
  params.append("category", "performance");
  params.append("category", "seo");
  params.append("category", "accessibility");
  const key = process.env.GOOGLE_PAGESPEED_API_KEY;
  if (key) params.set("key", key);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PSI_TIMEOUT_MS);
  try {
    const res = await fetch(`${PSI_ENDPOINT}?${params.toString()}`, { signal: controller.signal });
    if (!res.ok) return null;
    const data = await res.json();
    const lh = data?.lighthouseResult;
    if (!lh) return null;
    const cat = lh.categories || {};
    const audits = lh.audits || {};
    const pct = (s: number | null | undefined) => (typeof s === "number" ? Math.round(s * 100) : null);
    return {
      performance: pct(cat.performance?.score),
      seo: pct(cat.seo?.score),
      accessibility: pct(cat.accessibility?.score),
      lcp: typeof audits["largest-contentful-paint"]?.numericValue === "number"
        ? audits["largest-contentful-paint"].numericValue / 1000 : null,
      cls: typeof audits["cumulative-layout-shift"]?.numericValue === "number"
        ? audits["cumulative-layout-shift"].numericValue : null,
      inp: typeof audits["interaction-to-next-paint"]?.numericValue === "number"
        ? audits["interaction-to-next-paint"].numericValue : null,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Runs PageSpeed Insights for mobile + desktop. Returns merged signals,
 * or null if both strategies fail. Degrades gracefully — the caller
 * continues without performance data when this returns null.
 */
export async function fetchPageSpeed(url: string): Promise<PageSpeedSignals | null> {
  const [mobile, desktop] = await Promise.all([runOne(url, "mobile"), runOne(url, "desktop")]);
  if (!mobile && !desktop) return null;
  return {
    mobilePerformance: mobile?.performance ?? null,
    desktopPerformance: desktop?.performance ?? null,
    lcp: mobile?.lcp ?? desktop?.lcp ?? null,
    cls: mobile?.cls ?? desktop?.cls ?? null,
    inp: mobile?.inp ?? desktop?.inp ?? null,
    seoScore: mobile?.seo ?? desktop?.seo ?? null,
    accessibilityScore: mobile?.accessibility ?? desktop?.accessibility ?? null,
  };
}
