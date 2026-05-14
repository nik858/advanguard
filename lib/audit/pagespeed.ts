import type {
  PageSpeedSignals, LighthouseOpportunity, LighthouseFinding, CruxData, CruxMetric,
} from "@/types/audit";

const PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
// PageSpeed analysis of a real, image-heavy clinic site routinely takes 25-40s.
// The whole audit runs in the background (maxDuration 300s), so we give each
// strategy a generous 60s rather than losing the perf data to a tight timeout.
const PSI_TIMEOUT_MS = 60000;

type Strategy = "mobile" | "desktop";

type StrategyResult = {
  performance: number | null;
  seo: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  lcp: number | null;
  cls: number | null;
  inp: number | null;
  fcp: number | null;
  tbt: number | null;
  speedIndex: number | null;
  opportunities: LighthouseOpportunity[];
  failedAudits: LighthouseFinding[];
  field: CruxData | null;
  detectedPlatform: string | null;
  platformTips: string[];
};

/* eslint-disable @typescript-eslint/no-explicit-any */

// Lighthouse descriptions are markdown — strip links and code spans so the
// text reads cleanly when handed to the email LLM.
function stripMd(s: string): string {
  return String(s || "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function normRating(c: unknown): "FAST" | "AVERAGE" | "SLOW" | null {
  return c === "FAST" || c === "AVERAGE" || c === "SLOW" ? c : null;
}

// Pulls every actionable item out of a Lighthouse result: the perf
// "opportunities" (fixes with an estimated time saving) and every other
// audit that failed, across all four categories.
function extractFindings(lh: any): {
  opportunities: LighthouseOpportunity[];
  failedAudits: LighthouseFinding[];
  relevantIds: Set<string>;
} {
  const audits: Record<string, any> = lh?.audits || {};
  const categories: Record<string, any> = lh?.categories || {};

  const opportunities: LighthouseOpportunity[] = [];
  const oppIds = new Set<string>();
  for (const id of Object.keys(audits)) {
    const a = audits[id];
    const savings = a?.details?.overallSavingsMs;
    if (typeof savings === "number" && savings >= 1) {
      oppIds.add(id);
      const bytes = a?.details?.overallSavingsBytes;
      opportunities.push({
        title: String(a.title ?? id),
        description: stripMd(a.description),
        savingsMs: Math.round(savings),
        savingsBytes: typeof bytes === "number" ? Math.round(bytes) : null,
        displayValue: String(a.displayValue ?? ""),
      });
    }
  }
  opportunities.sort((x, y) => y.savingsMs - x.savingsMs);

  const failedAudits: LighthouseFinding[] = [];
  const failedIds = new Set<string>();
  const CATS: LighthouseFinding["category"][] = ["performance", "seo", "accessibility", "best-practices"];
  for (const cat of CATS) {
    const refs: any[] = categories[cat]?.auditRefs || [];
    for (const ref of refs) {
      const id: string | undefined = ref?.id;
      if (!id || failedIds.has(id) || oppIds.has(id)) continue;
      const a = audits[id];
      if (!a) continue;
      // Only real pass/fail audits — skip informative / notApplicable / manual.
      const mode = a.scoreDisplayMode;
      if (mode !== "binary" && mode !== "numeric" && mode !== "metricSavings") continue;
      if (typeof a.score !== "number" || a.score >= 0.9) continue;
      failedIds.add(id);
      failedAudits.push({
        title: String(a.title ?? id),
        description: stripMd(a.description),
        displayValue: String(a.displayValue ?? ""),
        category: cat,
      });
    }
  }

  return {
    opportunities: opportunities.slice(0, 12),
    failedAudits: failedAudits.slice(0, 20),
    relevantIds: new Set([...oppIds, ...failedIds]),
  };
}

// Real-user field data from the Chrome UX Report. Prefers page-level data,
// falls back to origin-level; null when the site has too little CrUX traffic.
function extractCrux(data: any): CruxData | null {
  const le = data?.loadingExperience || data?.originLoadingExperience;
  const m = le?.metrics;
  if (!m) return null;
  const metric = (key: string, divide: number): CruxMetric | null => {
    const e = m[key];
    if (!e || typeof e.percentile !== "number") return null;
    const rating = normRating(e.category);
    if (!rating) return null;
    return { value: e.percentile / divide, rating };
  };
  const crux: CruxData = {
    overall: normRating(le.overall_category),
    lcp: metric("LARGEST_CONTENTFUL_PAINT_MS", 1000),
    cls: metric("CUMULATIVE_LAYOUT_SHIFT_SCORE", 100),
    inp: metric("INTERACTION_TO_NEXT_PAINT", 1),
    fcp: metric("FIRST_CONTENTFUL_PAINT_MS", 1000),
  };
  if (!crux.overall && !crux.lcp && !crux.cls && !crux.inp && !crux.fcp) return null;
  return crux;
}

// The CMS / site builder Lighthouse recognised, plus the platform-specific
// advice it offers for the issues this particular site has.
function extractStack(lh: any, relevantIds: Set<string>): {
  detectedPlatform: string | null;
  platformTips: string[];
} {
  const packs: any[] = lh?.stackPacks || [];
  if (!packs.length) return { detectedPlatform: null, platformTips: [] };
  const names = packs.map((p) => p?.title).filter((t): t is string => typeof t === "string" && !!t);
  const tips: string[] = [];
  for (const p of packs) {
    const descs: Record<string, any> = p?.descriptions || {};
    for (const id of Object.keys(descs)) {
      if (relevantIds.has(id)) tips.push(stripMd(descs[id]));
    }
  }
  return {
    detectedPlatform: names.length ? [...new Set(names)].join(", ") : null,
    platformTips: [...new Set(tips)].slice(0, 8),
  };
}

async function runOne(url: string, strategy: Strategy): Promise<StrategyResult | null> {
  const params = new URLSearchParams({ url, strategy });
  params.append("category", "performance");
  params.append("category", "seo");
  params.append("category", "accessibility");
  params.append("category", "best-practices");
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
    const num = (id: string): number | null =>
      typeof audits[id]?.numericValue === "number" ? audits[id].numericValue : null;
    const secs = (id: string): number | null => {
      const v = num(id);
      return v != null ? v / 1000 : null;
    };
    const { opportunities, failedAudits, relevantIds } = extractFindings(lh);
    const { detectedPlatform, platformTips } = extractStack(lh, relevantIds);
    return {
      performance: pct(cat.performance?.score),
      seo: pct(cat.seo?.score),
      accessibility: pct(cat.accessibility?.score),
      bestPractices: pct(cat["best-practices"]?.score),
      lcp: secs("largest-contentful-paint"),
      cls: num("cumulative-layout-shift"),
      inp: num("interaction-to-next-paint"),
      fcp: secs("first-contentful-paint"),
      tbt: num("total-blocking-time"),
      speedIndex: secs("speed-index"),
      opportunities,
      failedAudits,
      field: extractCrux(data),
      detectedPlatform,
      platformTips,
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
 *
 * The two performance scores are kept separate; every other metric and all
 * the actionable detail come from the mobile run (the worst case, and how
 * most clinic visitors actually browse), falling back to desktop.
 */
export async function fetchPageSpeed(url: string): Promise<PageSpeedSignals | null> {
  const [mobile, desktop] = await Promise.all([runOne(url, "mobile"), runOne(url, "desktop")]);
  if (!mobile && !desktop) return null;
  const primary = mobile ?? desktop!;
  return {
    mobilePerformance: mobile?.performance ?? null,
    desktopPerformance: desktop?.performance ?? null,
    lcp: primary.lcp,
    cls: primary.cls,
    inp: primary.inp,
    fcp: primary.fcp,
    tbt: primary.tbt,
    speedIndex: primary.speedIndex,
    seoScore: primary.seo,
    accessibilityScore: primary.accessibility,
    bestPracticesScore: primary.bestPractices,
    opportunities: primary.opportunities,
    failedAudits: primary.failedAudits,
    field: primary.field,
    detectedPlatform: primary.detectedPlatform,
    platformTips: primary.platformTips,
  };
}
