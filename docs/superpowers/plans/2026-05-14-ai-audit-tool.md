# AI Audit Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a clinic owner submits their work email on the Advanguard landing, automatically identify their website, audit it (~17 HTML signals + PageSpeed), generate a personalized email with Claude, and deliver it via the GoHighLevel "Audit Email" webhook — fully automated, with a graceful fallback email on any failure.

**Architecture:** `/api/lead` validates and responds immediately, then runs the audit pipeline in the background via Next.js `after()`. The pipeline (`lib/audit/`) is a set of single-responsibility modules — domain resolution, HTML scraping, PageSpeed, AI generation, fallback — chained by an orchestrator (`lib/audit/index.ts`). Prompts live in Vercel Blob (live-editable from the admin) with a bundled default fallback.

**Tech Stack:** Next.js 16 (App Router) · TypeScript · `@anthropic-ai/sdk` (Claude Haiku) · `cheerio` (HTML parsing) · Google PageSpeed Insights API · Vercel Blob · Vitest · Zod

**Spec source:** [docs/superpowers/specs/2026-05-14-ai-audit-tool-design.md](../specs/2026-05-14-ai-audit-tool-design.md)

---

## File Structure

```
types/
  audit.ts                       — NEW: Lead, Signals, AuditEmail, AuditOutcome types
  prompts.ts                     — MODIFIED: richer PromptsSchema

content/
  prompts.json                   — MODIFIED: real initial English prompt framework

lib/
  blob.ts                        — MODIFIED: + PROMPTS_KEY, savePrompts(), loadPromptsBlob()
  ghl.ts                         — MODIFIED: postAuditToGHL reworked; postLeadToGHL removed
  audit/
    domain.ts                    — NEW: extractDomain, candidateUrls, resolveReachableUrl
    scrape.ts                    — NEW: fetchHtml, parseSignals (cheerio, ~17 signals)
    pagespeed.ts                 — NEW: fetchPageSpeed (Google PSI API)
    signals.ts                   — NEW: formatSignalsForPrompt
    prompts.ts                   — NEW: loadPrompts (Blob → bundled default)
    ai.ts                        — NEW: generateAuditEmail (Claude)
    fallback.ts                  — NEW: generateFallbackEmail
    index.ts                     — NEW: runAudit orchestrator

app/api/
  lead/route.ts                  — MODIFIED: validate → respond → after(runAudit); maxDuration
  prompts/route.ts               — NEW: GET/PUT prompts (session-protected)

app/admin/funnel/
  page.tsx                       — REPLACED: real prompt editor page
  _components/PromptEditor.tsx   — NEW: editor form (client component)

tests/
  fixtures/clinic-rich.html      — NEW: a content-rich clinic homepage fixture
  fixtures/clinic-thin.html      — NEW: a near-empty homepage fixture
  lib/audit/domain.test.ts       — NEW
  lib/audit/scrape.test.ts       — NEW
  lib/audit/pagespeed.test.ts    — NEW
  lib/audit/signals.test.ts      — NEW
  lib/audit/prompts.test.ts      — NEW
  lib/audit/ai.test.ts           — NEW
  lib/audit/fallback.test.ts     — NEW
  lib/audit/index.test.ts        — NEW
  lib/ghl.test.ts                — MODIFIED: new postAuditToGHL shape
  api/lead.test.ts               — MODIFIED: asserts runAudit scheduling path
```

---

## Phase 1 — Foundations

### Task 1: Install dependencies

**Files:** Modify `package.json`

- [ ] **Step 1: Install runtime dependencies**

```bash
cd "/Users/tb/Documents/TB Dev/Advanguard"
npm install @anthropic-ai/sdk cheerio
```

- [ ] **Step 2: Verify they resolve**

```bash
npx tsc --noEmit
```
Expected: exit 0 (no usage yet, just confirms install didn't break types).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(audit): add @anthropic-ai/sdk + cheerio"
```

---

### Task 2: Types + prompts schema + initial prompt framework

**Files:**
- Create: `types/audit.ts`
- Modify: `types/prompts.ts`, `content/prompts.json`

- [ ] **Step 1: Create types/audit.ts**

```typescript
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
```

- [ ] **Step 2: Replace types/prompts.ts**

```typescript
import { z } from "zod";

export const PromptsSchema = z.object({
  version: z.number().default(1),
  system_prompt: z.string().min(1),
  email_instructions: z.string().min(1),
  subject_instructions: z.string().min(1),
  tone: z.string().min(1),
  signature: z.string().min(1),
});

export type Prompts = z.infer<typeof PromptsSchema>;
```

- [ ] **Step 3: Replace content/prompts.json**

```json
{
  "version": 1,
  "system_prompt": "You are a senior website conversion and SEO consultant who audits the websites of medical and aesthetic clinics. You receive a structured list of signals extracted from a clinic's website and you turn it into a short, credible, personalized outreach email. You are precise and concrete — you reference what was actually found on the site, never generic advice. You never invent facts that are not in the signals. You are direct but warm: you point out what is costing the clinic bookings, but you frame it as fixable and worth a conversation.",
  "email_instructions": "Write a short outreach email (max ~180 words) to the clinic owner. Open with one specific, genuine observation about their site. Then list 2-3 concrete strengths and 2-3 priority weaknesses, each tied to an actual signal (e.g. 'no online booking widget above the fold', 'mobile performance score of 42'). Frame the weaknesses as costing them bookings, but fixable. End with one open question inviting a reply. Do not use markdown, bullet characters, or headers — plain paragraphs and simple line breaks only, because this is an email body. Do not include a subject line in the body.",
  "subject_instructions": "Write one short email subject line (max ~60 characters). Make it specific to this clinic — reference their domain or one concrete finding. Curiosity-driven, not clickbait. No emojis.",
  "tone": "professional, direct, warm — a knowledgeable peer, not a salesperson",
  "signature": "The Advanguard Team"
}
```

- [ ] **Step 4: Write a test that the bundled prompts parse**

Create `tests/lib/audit/prompts.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { PromptsSchema } from "@/types/prompts";
import promptsJson from "@/content/prompts.json";

describe("bundled prompts.json", () => {
  it("matches PromptsSchema", () => {
    const result = PromptsSchema.safeParse(promptsJson);
    if (!result.success) console.error(result.error.issues);
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 5: Run the test**

```bash
npm test -- tests/lib/audit/prompts.test.ts
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add types/audit.ts types/prompts.ts content/prompts.json tests/lib/audit/prompts.test.ts
git commit -m "feat(audit): pipeline types + richer prompts schema + initial prompt framework"
```

---

## Phase 2 — Pipeline modules

### Task 3: Domain resolution (`lib/audit/domain.ts`)

**Files:**
- Create: `lib/audit/domain.ts`, `tests/lib/audit/domain.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/audit/domain.test.ts`:
```typescript
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractDomain, candidateUrls } from "@/lib/audit/domain";

describe("extractDomain", () => {
  it("extracts and lowercases the domain", () => {
    expect(extractDomain("Matt@ClinicABC.com")).toBe("clinicabc.com");
  });
  it("handles subdomains", () => {
    expect(extractDomain("info@mail.clinic.co.uk")).toBe("mail.clinic.co.uk");
  });
});

describe("candidateUrls", () => {
  it("produces https apex + www candidates", () => {
    expect(candidateUrls("clinicabc.com")).toEqual([
      "https://clinicabc.com",
      "https://www.clinicabc.com",
    ]);
  });
});

describe("resolveReachableUrl", () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it("returns the first reachable candidate's final URL", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response("", { status: 200, headers: { "content-type": "text/html" } }),
    );
    const { resolveReachableUrl } = await import("@/lib/audit/domain");
    const url = await resolveReachableUrl("clinicabc.com");
    expect(url).toBe("https://clinicabc.com/");
  });

  it("returns null when no candidate is reachable", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("ENOTFOUND"));
    const { resolveReachableUrl } = await import("@/lib/audit/domain");
    const url = await resolveReachableUrl("does-not-exist-xyz.com");
    expect(url).toBeNull();
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- tests/lib/audit/domain.test.ts
```
Expected: FAIL (module not found).

- [ ] **Step 3: Implement lib/audit/domain.ts**

```typescript
// Resolve a clinic's website URL from their email domain.

export function extractDomain(email: string): string {
  const at = email.lastIndexOf("@");
  return email.slice(at + 1).trim().toLowerCase();
}

export function candidateUrls(domain: string): string[] {
  return [`https://${domain}`, `https://www.${domain}`];
}

const FETCH_TIMEOUT_MS = 8000;

async function tryFetch(url: string): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "AdvanguardAuditBot/1.0 (+https://advanguard.vercel.app)" },
    });
    return res;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Tries the candidate URLs in order. Returns the final URL (after redirects)
 * of the first one that responds with a 2xx/3xx, or null if none are reachable.
 */
export async function resolveReachableUrl(domain: string): Promise<string | null> {
  for (const candidate of candidateUrls(domain)) {
    const res = await tryFetch(candidate);
    if (res && res.status < 400) {
      return res.url || candidate;
    }
  }
  return null;
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- tests/lib/audit/domain.test.ts
```
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/audit/domain.ts tests/lib/audit/domain.test.ts
git commit -m "feat(audit): domain extraction + reachable URL resolution"
```

---

### Task 4: HTML scraping + signal parsing (`lib/audit/scrape.ts`)

**Files:**
- Create: `lib/audit/scrape.ts`, `tests/lib/audit/scrape.test.ts`, `tests/fixtures/clinic-rich.html`, `tests/fixtures/clinic-thin.html`

- [ ] **Step 1: Create the rich fixture**

Create `tests/fixtures/clinic-rich.html`:
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Bright Smile Dental Clinic — Family Dentistry in Austin</title>
  <meta name="description" content="Bright Smile Dental Clinic offers family dentistry, cosmetic dentistry, and emergency care in Austin, TX." />
  <link rel="alternate" hreflang="es" href="https://example.com/es" />
  <script>fbq('init', '123456');</script>
  <script>gtag('config', 'G-XXXX');</script>
  <script src="https://widget.calendly.com/widget.js"></script>
  <script src="https://embed.tawk.to/abc/default"></script>
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"LocalBusiness","name":"Bright Smile Dental"}</script>
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage"}</script>
</head>
<body>
  <header><a href="tel:+15125550199">Call us</a></header>
  <main>
    <video src="/intro.mp4"></video>
    <a href="https://calendly.com/brightsmile/visit" class="btn">Book an appointment</a>
    <section class="testimonials"><h2>What our patients say</h2><div class="review">Great care!</div></section>
    <section class="before-after"><h2>Before &amp; After</h2><img src="/before.jpg" /><img src="/after.jpg" /></section>
    <section id="faq"><h2>Frequently Asked Questions</h2></section>
    <section class="pricing"><h2>Pricing</h2><p>Cleanings from $99. Financing available.</p></section>
    <div class="google-reviews">Google Reviews 4.9 stars</div>
    <nav>
      <a href="/services/cleanings">Cleanings</a>
      <a href="/services/whitening">Whitening</a>
      <a href="/services/implants">Implants</a>
      <a href="/team">Meet our doctors</a>
      <a href="/contact">Contact</a>
    </nav>
    <address>123 Main St, Austin, TX 78701</address>
  </main>
</body>
</html>
```

- [ ] **Step 2: Create the thin fixture**

Create `tests/fixtures/clinic-thin.html`:
```html
<!doctype html>
<html>
<head><title></title></head>
<body><div id="root"></div></body>
</html>
```

- [ ] **Step 3: Write the failing tests**

Create `tests/lib/audit/scrape.test.ts`:
```typescript
// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseSignals } from "@/lib/audit/scrape";

const rich = readFileSync(join(__dirname, "../../fixtures/clinic-rich.html"), "utf-8");
const thin = readFileSync(join(__dirname, "../../fixtures/clinic-thin.html"), "utf-8");

describe("parseSignals — rich clinic site", () => {
  const s = parseSignals(rich, "https://example.com");

  it("detects tracking pixels", () => {
    expect(s.hasMetaPixel).toBe(true);
    expect(s.hasGoogleAnalytics).toBe(true);
  });
  it("detects booking widget", () => { expect(s.hasBookingWidget).toBe(true); });
  it("detects testimonials", () => { expect(s.hasTestimonials).toBe(true); });
  it("detects before/after gallery", () => { expect(s.hasBeforeAfterGallery).toBe(true); });
  it("detects FAQ", () => { expect(s.hasFaq).toBe(true); });
  it("extracts schema types", () => {
    expect(s.schemaTypes).toContain("LocalBusiness");
    expect(s.schemaTypes).toContain("FAQPage");
  });
  it("detects live chat", () => { expect(s.hasLiveChat).toBe(true); });
  it("detects homepage video", () => { expect(s.hasHomepageVideo).toBe(true); });
  it("detects pricing info", () => { expect(s.hasPricingInfo).toBe(true); });
  it("detects google reviews", () => { expect(s.hasGoogleReviews).toBe(true); });
  it("detects team page link", () => { expect(s.hasTeamPage).toBe(true); });
  it("detects multilingual", () => { expect(s.isMultilingual).toBe(true); });
  it("counts service pages", () => { expect(s.servicePageCount).toBeGreaterThanOrEqual(3); });
  it("detects viewport meta", () => { expect(s.hasViewportMeta).toBe(true); });
  it("extracts meta title and description", () => {
    expect(s.metaTitle).toContain("Bright Smile");
    expect(s.metaDescription).toContain("family dentistry");
  });
  it("detects phone and address", () => {
    expect(s.hasPhone).toBe(true);
    expect(s.hasAddress).toBe(true);
  });
});

describe("parseSignals — thin site", () => {
  const s = parseSignals(thin, "https://example.com");
  it("returns all-false / empty signals without throwing", () => {
    expect(s.hasBookingWidget).toBe(false);
    expect(s.hasTestimonials).toBe(false);
    expect(s.schemaTypes).toEqual([]);
    expect(s.servicePageCount).toBe(0);
    expect(s.metaTitle).toBe(null);
  });
});
```

- [ ] **Step 4: Run to confirm failure**

```bash
npm test -- tests/lib/audit/scrape.test.ts
```
Expected: FAIL (module not found).

- [ ] **Step 5: Implement lib/audit/scrape.ts**

```typescript
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
export function parseSignals(html: string, url: string): HtmlSignals {
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

  // Service page links: internal links whose href contains "/service"
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
    hasBeforeAfterGallery: hasAny(allHtml, ["before & after", "before and after", "before/after", "avant / après", "avant-après"]),
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
```

- [ ] **Step 6: Run tests**

```bash
npm test -- tests/lib/audit/scrape.test.ts
```
Expected: PASS. If a detection assertion fails, adjust the detection logic or the fixture until they agree — the fixture represents a realistic rich clinic site.

- [ ] **Step 7: Commit**

```bash
git add lib/audit/scrape.ts tests/lib/audit/scrape.test.ts tests/fixtures/clinic-rich.html tests/fixtures/clinic-thin.html
git commit -m "feat(audit): HTML fetch + cheerio signal parsing (~17 signals)"
```

---

### Task 5: PageSpeed Insights client (`lib/audit/pagespeed.ts`)

**Files:**
- Create: `lib/audit/pagespeed.ts`, `tests/lib/audit/pagespeed.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/audit/pagespeed.test.ts`:
```typescript
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

function psiResponse(performance: number, seo: number) {
  return {
    lighthouseResult: {
      categories: {
        performance: { score: performance },
        seo: { score: seo },
        accessibility: { score: 0.9 },
      },
      audits: {
        "largest-contentful-paint": { numericValue: 2500 },
        "cumulative-layout-shift": { numericValue: 0.05 },
        "interaction-to-next-paint": { numericValue: 180 },
      },
    },
  };
}

describe("fetchPageSpeed", () => {
  beforeEach(() => { vi.restoreAllMocks(); vi.resetModules(); });

  it("returns merged mobile + desktop signals", async () => {
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(psiResponse(0.42, 0.8)), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(psiResponse(0.91, 0.85)), { status: 200 }));
    const { fetchPageSpeed } = await import("@/lib/audit/pagespeed");
    const r = await fetchPageSpeed("https://example.com");
    expect(r).not.toBeNull();
    expect(r!.mobilePerformance).toBe(42);
    expect(r!.desktopPerformance).toBe(91);
    expect(r!.lcp).toBeCloseTo(2.5);
    expect(r!.seoScore).toBe(80);
  });

  it("returns null when the API errors", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response("err", { status: 500 }));
    const { fetchPageSpeed } = await import("@/lib/audit/pagespeed");
    expect(await fetchPageSpeed("https://example.com")).toBeNull();
  });

  it("returns null when the API times out / rejects", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("timeout"));
    const { fetchPageSpeed } = await import("@/lib/audit/pagespeed");
    expect(await fetchPageSpeed("https://example.com")).toBeNull();
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- tests/lib/audit/pagespeed.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Implement lib/audit/pagespeed.ts**

```typescript
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
```

- [ ] **Step 4: Run tests**

```bash
npm test -- tests/lib/audit/pagespeed.test.ts
```
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/audit/pagespeed.ts tests/lib/audit/pagespeed.test.ts
git commit -m "feat(audit): Google PageSpeed Insights client (graceful null on failure)"
```

---

### Task 6: Signal formatting for the prompt (`lib/audit/signals.ts`)

**Files:**
- Create: `lib/audit/signals.ts`, `tests/lib/audit/signals.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/audit/signals.test.ts`:
```typescript
// @vitest-environment node
import { describe, it, expect } from "vitest";
import { formatSignalsForPrompt } from "@/lib/audit/signals";
import type { Signals } from "@/types/audit";

const signals: Signals = {
  url: "https://brightsmile.com",
  isHttps: true,
  html: {
    hasMetaPixel: true, hasGoogleAnalytics: true, hasGoogleAds: false,
    hasBookingWidget: false, hasTestimonials: true, hasBeforeAfterGallery: false,
    hasFaq: false, schemaTypes: ["LocalBusiness"], hasLiveChat: false,
    hasHomepageVideo: false, hasPricingInfo: false, hasGoogleReviews: true,
    hasTeamPage: true, isMultilingual: false, servicePageCount: 4,
    hasViewportMeta: true, metaTitle: "Bright Smile Dental", metaDescription: null,
    hasPhone: true, hasAddress: true,
  },
  pagespeed: {
    mobilePerformance: 42, desktopPerformance: 88, lcp: 4.2, cls: 0.18,
    inp: 320, seoScore: 78, accessibilityScore: 91,
  },
};

describe("formatSignalsForPrompt", () => {
  it("renders a human-readable signal summary", () => {
    const out = formatSignalsForPrompt(signals);
    expect(out).toContain("https://brightsmile.com");
    expect(out).toContain("Mobile performance: 42");
    expect(out).toContain("Online booking widget: not found");
    expect(out).toContain("Testimonials: found");
  });

  it("handles missing pagespeed gracefully", () => {
    const out = formatSignalsForPrompt({ ...signals, pagespeed: null });
    expect(out).toContain("PageSpeed data: unavailable");
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- tests/lib/audit/signals.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Implement lib/audit/signals.ts**

```typescript
import type { Signals } from "@/types/audit";

function yn(b: boolean): string {
  return b ? "found" : "not found";
}

/**
 * Renders a Signals object into a compact, human-readable block that Claude
 * can reason over. Plain text, one signal per line.
 */
export function formatSignalsForPrompt(s: Signals): string {
  const h = s.html;
  const lines: string[] = [
    `Website audited: ${s.url}`,
    `HTTPS: ${s.isHttps ? "yes" : "no"}`,
    ``,
    `--- On-page signals ---`,
    `Meta/Facebook Pixel: ${yn(h.hasMetaPixel)}`,
    `Google Analytics: ${yn(h.hasGoogleAnalytics)}`,
    `Google Ads tracking: ${yn(h.hasGoogleAds)}`,
    `Online booking widget: ${yn(h.hasBookingWidget)}`,
    `Testimonials / social proof: ${yn(h.hasTestimonials)}`,
    `Before/after gallery: ${yn(h.hasBeforeAfterGallery)}`,
    `FAQ section: ${yn(h.hasFaq)}`,
    `Structured data (schema.org types): ${h.schemaTypes.length ? h.schemaTypes.join(", ") : "none"}`,
    `Live chat / chatbot: ${yn(h.hasLiveChat)}`,
    `Homepage video: ${yn(h.hasHomepageVideo)}`,
    `Pricing / financing info: ${yn(h.hasPricingInfo)}`,
    `Google Reviews / reputation widget: ${yn(h.hasGoogleReviews)}`,
    `Team / doctor credentials page: ${yn(h.hasTeamPage)}`,
    `Multilingual support: ${yn(h.isMultilingual)}`,
    `Distinct service pages: ${h.servicePageCount}`,
    `Mobile viewport meta tag: ${yn(h.hasViewportMeta)}`,
    `Page title: ${h.metaTitle ?? "missing"}`,
    `Meta description: ${h.metaDescription ?? "missing"}`,
    `Phone number on page: ${yn(h.hasPhone)}`,
    `Physical address on page: ${yn(h.hasAddress)}`,
    ``,
    `--- Performance (Google PageSpeed) ---`,
  ];
  if (s.pagespeed) {
    const p = s.pagespeed;
    lines.push(
      `Mobile performance: ${p.mobilePerformance ?? "n/a"} / 100`,
      `Desktop performance: ${p.desktopPerformance ?? "n/a"} / 100`,
      `Largest Contentful Paint: ${p.lcp != null ? p.lcp.toFixed(1) + "s" : "n/a"}`,
      `Cumulative Layout Shift: ${p.cls != null ? p.cls.toFixed(2) : "n/a"}`,
      `Interaction to Next Paint: ${p.inp != null ? p.inp + "ms" : "n/a"}`,
      `SEO score: ${p.seoScore ?? "n/a"} / 100`,
      `Accessibility score: ${p.accessibilityScore ?? "n/a"} / 100`,
    );
  } else {
    lines.push(`PageSpeed data: unavailable for this site`);
  }
  return lines.join("\n");
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- tests/lib/audit/signals.test.ts
```
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/audit/signals.ts tests/lib/audit/signals.test.ts
git commit -m "feat(audit): format signals into a prompt-ready text block"
```

---

### Task 7: Prompt storage (`lib/blob.ts` + `lib/audit/prompts.ts`)

**Files:**
- Modify: `lib/blob.ts`
- Create: `lib/audit/prompts.ts`
- Modify: `tests/lib/audit/prompts.test.ts`

- [ ] **Step 1: Add prompt helpers to lib/blob.ts**

Add to `lib/blob.ts` (after the existing `listMedia` function, keep everything else unchanged):
```typescript
export const PROMPTS_KEY = "prompts/current.json";

export async function savePrompts(prompts: unknown): Promise<void> {
  await put(PROMPTS_KEY, JSON.stringify(prompts), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export async function loadPromptsBlob(): Promise<unknown | null> {
  try {
    const { blobs } = await list({ prefix: PROMPTS_KEY });
    const match = blobs.find((b) => b.pathname === PROMPTS_KEY);
    if (!match) return null;
    const r = await fetch(match.url, { cache: "no-store" });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

export async function deletePrompts(): Promise<void> {
  try {
    const { blobs } = await list({ prefix: PROMPTS_KEY });
    for (const b of blobs) if (b.pathname === PROMPTS_KEY) await del(b.url);
  } catch {
    /* ignore — if there is nothing to delete, loadPrompts already falls back to the default */
  }
}
```

- [ ] **Step 2: Implement lib/audit/prompts.ts**

```typescript
import { PromptsSchema, type Prompts } from "@/types/prompts";
import { loadPromptsBlob } from "@/lib/blob";
import bundledDefault from "@/content/prompts.json";

/**
 * Loads the active prompt set. Prefers the live, admin-edited version stored
 * in Vercel Blob; falls back to the bundled default if Blob is empty or invalid.
 */
export async function loadPrompts(): Promise<Prompts> {
  const fromBlob = await loadPromptsBlob();
  if (fromBlob) {
    const parsed = PromptsSchema.safeParse(fromBlob);
    if (parsed.success) return parsed.data;
  }
  return PromptsSchema.parse(bundledDefault);
}
```

- [ ] **Step 3: Add tests to tests/lib/audit/prompts.test.ts**

Replace `tests/lib/audit/prompts.test.ts` with:
```typescript
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PromptsSchema } from "@/types/prompts";
import promptsJson from "@/content/prompts.json";

describe("bundled prompts.json", () => {
  it("matches PromptsSchema", () => {
    const result = PromptsSchema.safeParse(promptsJson);
    if (!result.success) console.error(result.error.issues);
    expect(result.success).toBe(true);
  });
});

describe("loadPrompts", () => {
  beforeEach(() => { vi.resetModules(); });

  it("returns the bundled default when Blob is empty", async () => {
    vi.doMock("@/lib/blob", () => ({ loadPromptsBlob: async () => null }));
    const { loadPrompts } = await import("@/lib/audit/prompts");
    const p = await loadPrompts();
    expect(p.version).toBe(1);
    expect(p.system_prompt.length).toBeGreaterThan(0);
  });

  it("returns the Blob version when present and valid", async () => {
    const custom = {
      version: 2, system_prompt: "custom sys", email_instructions: "custom email",
      subject_instructions: "custom subj", tone: "custom tone", signature: "Custom Sig",
    };
    vi.doMock("@/lib/blob", () => ({ loadPromptsBlob: async () => custom }));
    const { loadPrompts } = await import("@/lib/audit/prompts");
    const p = await loadPrompts();
    expect(p.version).toBe(2);
    expect(p.system_prompt).toBe("custom sys");
  });

  it("falls back to default when the Blob version is invalid", async () => {
    vi.doMock("@/lib/blob", () => ({ loadPromptsBlob: async () => ({ garbage: true }) }));
    const { loadPrompts } = await import("@/lib/audit/prompts");
    const p = await loadPrompts();
    expect(p.version).toBe(1);
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npm test -- tests/lib/audit/prompts.test.ts
```
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/blob.ts lib/audit/prompts.ts tests/lib/audit/prompts.test.ts
git commit -m "feat(audit): prompt storage on Vercel Blob with bundled-default fallback"
```

---

### Task 8: AI email generation (`lib/audit/ai.ts`)

**Files:**
- Create: `lib/audit/ai.ts`, `tests/lib/audit/ai.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/audit/ai.test.ts`:
```typescript
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Signals, Lead } from "@/types/audit";

const lead: Lead = { email: "matt@brightsmile.com", firstName: "Matt", domain: "brightsmile.com" };
const signals: Signals = {
  url: "https://brightsmile.com", isHttps: true,
  html: {
    hasMetaPixel: false, hasGoogleAnalytics: true, hasGoogleAds: false,
    hasBookingWidget: false, hasTestimonials: true, hasBeforeAfterGallery: false,
    hasFaq: false, schemaTypes: [], hasLiveChat: false, hasHomepageVideo: false,
    hasPricingInfo: false, hasGoogleReviews: false, hasTeamPage: true,
    isMultilingual: false, servicePageCount: 3, hasViewportMeta: true,
    metaTitle: "Bright Smile Dental", metaDescription: null, hasPhone: true, hasAddress: true,
  },
  pagespeed: null,
};

const PROMPTS = {
  version: 1, system_prompt: "sys", email_instructions: "email instr",
  subject_instructions: "subj instr", tone: "warm", signature: "The Advanguard Team",
};

describe("generateAuditEmail", () => {
  beforeEach(() => { vi.resetModules(); vi.restoreAllMocks(); process.env.ANTHROPIC_API_KEY = "test-key"; });

  it("returns the parsed subject and body from Claude's JSON response", async () => {
    vi.doMock("@/lib/audit/prompts", () => ({ loadPrompts: async () => PROMPTS }));
    const createMock = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: '{"subject":"Matt, a quick look at brightsmile.com","body":"Hi Matt,\\n\\nI took a look..."}' }],
    });
    vi.doMock("@anthropic-ai/sdk", () => ({
      default: vi.fn().mockImplementation(() => ({ messages: { create: createMock } })),
    }));
    const { generateAuditEmail } = await import("@/lib/audit/ai");
    const email = await generateAuditEmail(signals, lead);
    expect(email.subject).toContain("brightsmile.com");
    expect(email.body).toContain("Hi Matt");
    expect(createMock).toHaveBeenCalledOnce();
  });

  it("throws when Claude returns unparseable content", async () => {
    vi.doMock("@/lib/audit/prompts", () => ({ loadPrompts: async () => PROMPTS }));
    vi.doMock("@anthropic-ai/sdk", () => ({
      default: vi.fn().mockImplementation(() => ({
        messages: { create: vi.fn().mockResolvedValue({ content: [{ type: "text", text: "not json at all" }] }) },
      })),
    }));
    const { generateAuditEmail } = await import("@/lib/audit/ai");
    await expect(generateAuditEmail(signals, lead)).rejects.toThrow();
  });

  it("throws when the API key is missing", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    vi.doMock("@/lib/audit/prompts", () => ({ loadPrompts: async () => PROMPTS }));
    const { generateAuditEmail } = await import("@/lib/audit/ai");
    await expect(generateAuditEmail(signals, lead)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- tests/lib/audit/ai.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Implement lib/audit/ai.ts**

```typescript
import Anthropic from "@anthropic-ai/sdk";
import type { Signals, Lead, AuditEmail } from "@/types/audit";
import { loadPrompts } from "@/lib/audit/prompts";
import { formatSignalsForPrompt } from "@/lib/audit/signals";

const MODEL = "claude-haiku-4-5-20251001";

/**
 * Generates a personalized audit email with Claude. Loads the active prompt set,
 * feeds it the formatted signals, and parses Claude's JSON response.
 * Throws on missing API key, API failure, or unparseable response — the caller
 * (the orchestrator) catches and switches to the fallback email.
 */
export async function generateAuditEmail(signals: Signals, lead: Lead): Promise<AuditEmail> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const prompts = await loadPrompts();
  const client = new Anthropic({ apiKey });

  const userMessage = [
    `Clinic owner first name: ${lead.firstName || "(unknown)"}`,
    `Clinic email domain: ${lead.domain}`,
    ``,
    formatSignalsForPrompt(signals),
    ``,
    `--- Your task ---`,
    `Tone: ${prompts.tone}`,
    `Email body instructions: ${prompts.email_instructions}`,
    `Subject line instructions: ${prompts.subject_instructions}`,
    `Sign the email as: ${prompts.signature}`,
    ``,
    `Respond with ONLY a JSON object, no markdown, no code fence, in exactly this shape:`,
    `{"subject": "<the subject line>", "body": "<the full email body>"}`,
  ].join("\n");

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: [{ type: "text", text: prompts.system_prompt, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = res.content.find((b) => b.type === "text");
  const raw = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";

  // Tolerate a stray code fence around the JSON.
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Claude response was not valid JSON");
  }

  const obj = parsed as Record<string, unknown>;
  if (typeof obj.subject !== "string" || typeof obj.body !== "string" || !obj.subject || !obj.body) {
    throw new Error("Claude response missing subject/body");
  }
  return { subject: obj.subject, body: obj.body };
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- tests/lib/audit/ai.test.ts
```
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/audit/ai.ts tests/lib/audit/ai.test.ts
git commit -m "feat(audit): Claude email generation with prompt caching"
```

---

### Task 9: Fallback email (`lib/audit/fallback.ts`)

**Files:**
- Create: `lib/audit/fallback.ts`, `tests/lib/audit/fallback.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/audit/fallback.test.ts`:
```typescript
// @vitest-environment node
import { describe, it, expect } from "vitest";
import { generateFallbackEmail } from "@/lib/audit/fallback";
import type { Lead } from "@/types/audit";

const lead: Lead = { email: "matt@brightsmile.com", firstName: "Matt", domain: "brightsmile.com" };

describe("generateFallbackEmail", () => {
  it("produces a graceful, non-technical email with a subject and body", () => {
    const email = generateFallbackEmail(lead, "site unreachable");
    expect(email.subject.length).toBeGreaterThan(0);
    expect(email.body).toContain("Matt");
    expect(email.body).toContain("brightsmile.com");
    // never leak the technical reason to the recipient
    expect(email.body.toLowerCase()).not.toContain("unreachable");
    expect(email.body.toLowerCase()).not.toContain("error");
  });

  it("handles a missing first name", () => {
    const email = generateFallbackEmail({ ...lead, firstName: "" }, "claude failed");
    expect(email.body.length).toBeGreaterThan(0);
    expect(email.body).not.toContain("undefined");
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- tests/lib/audit/fallback.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Implement lib/audit/fallback.ts**

```typescript
import type { Lead, AuditEmail } from "@/types/audit";

/**
 * Builds a graceful fallback email used whenever the audit pipeline fails.
 * The recipient never sees the technical reason — `reason` is for logging only.
 * The lead always receives something useful and human.
 */
export function generateFallbackEmail(lead: Lead, _reason: string): AuditEmail {
  const greeting = lead.firstName ? `Hi ${lead.firstName},` : "Hi,";
  const body = [
    greeting,
    "",
    `Thanks for requesting a website audit for ${lead.domain}.`,
    "",
    "We had trouble running our automated analysis on your site, so one of our specialists is going to review it personally and get back to you shortly with a few concrete recommendations.",
    "",
    "In the meantime, if there's anything specific you'd like us to look at, just reply to this email.",
    "",
    "The Advanguard Team",
  ].join("\n");

  return {
    subject: `Your website audit for ${lead.domain}`,
    body,
  };
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- tests/lib/audit/fallback.test.ts
```
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/audit/fallback.ts tests/lib/audit/fallback.test.ts
git commit -m "feat(audit): graceful fallback email generator"
```

---

### Task 10: Rework GHL client (`lib/ghl.ts`)

**Files:**
- Modify: `lib/ghl.ts`
- Modify: `tests/lib/ghl.test.ts`

- [ ] **Step 1: Replace lib/ghl.ts**

The current file exports `postLeadToGHL`, `LeadPayload`, `postAuditToGHL`, `AuditPayload`. Replace the entire file with:
```typescript
async function postWithRetry(url: string, body: unknown, max = 3): Promise<void> {
  let lastErr: unknown;
  for (let i = 0; i < max; i++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) return;
      if (res.status < 500) throw new Error(`GHL ${res.status}: ${await res.text()}`);
      lastErr = new Error(`GHL ${res.status}`);
    } catch (e) { lastErr = e; }
    if (i < max - 1) await new Promise((r) => setTimeout(r, 1000 * Math.pow(3, i)));
  }
  throw lastErr;
}

/**
 * Payload for the GHL "Audit Email" inbound webhook. The GHL workflow maps
 * these exact field names: email -> contact Email, first_name -> contact First Name,
 * ai_email_subject -> email subject, ai_email_body -> email body.
 */
export type AuditWebhookPayload = {
  email: string;
  first_name: string;
  ai_email_subject: string;
  ai_email_body: string;
};

/** POSTs the finished audit (or fallback) email to the GHL "Audit Email" webhook. */
export async function postAuditToGHL(payload: AuditWebhookPayload): Promise<void> {
  const url = process.env.GHL_AUDIT_WEBHOOK_URL;
  if (!url) throw new Error("GHL_AUDIT_WEBHOOK_URL not set");
  await postWithRetry(url, payload);
}
```

- [ ] **Step 2: Replace tests/lib/ghl.test.ts**

```typescript
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  process.env.GHL_AUDIT_WEBHOOK_URL = "https://services.leadconnectorhq.com/hooks/test";
});

const payload = {
  email: "matt@brightsmile.com",
  first_name: "Matt",
  ai_email_subject: "Matt, a quick look at brightsmile.com",
  ai_email_body: "Hi Matt,\n\nI took a look...",
};

describe("postAuditToGHL", () => {
  it("POSTs the payload to the audit webhook URL", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 200 }));
    const { postAuditToGHL } = await import("@/lib/ghl");
    await postAuditToGHL(payload);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://services.leadconnectorhq.com/hooks/test",
      expect.objectContaining({ method: "POST" }),
    );
    const sentBody = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    expect(sentBody).toEqual(payload);
  });

  it("retries on 5xx", async () => {
    const fetchSpy = vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 502 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    const { postAuditToGHL } = await import("@/lib/ghl");
    await postAuditToGHL(payload);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("throws when the webhook URL is not configured", async () => {
    delete process.env.GHL_AUDIT_WEBHOOK_URL;
    vi.resetModules();
    const { postAuditToGHL } = await import("@/lib/ghl");
    await expect(postAuditToGHL(payload)).rejects.toThrow();
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm test -- tests/lib/ghl.test.ts
```
Expected: PASS (3 tests). Note: this will leave `tests/api/lead.test.ts` failing because it imports the now-removed `postLeadToGHL` path — that is fixed in Task 12.

- [ ] **Step 4: Commit**

```bash
git add lib/ghl.ts tests/lib/ghl.test.ts
git commit -m "feat(ghl): rework postAuditToGHL to the audit-webhook shape; remove postLeadToGHL"
```

---

### Task 11: Orchestrator (`lib/audit/index.ts`)

**Files:**
- Create: `lib/audit/index.ts`, `tests/lib/audit/index.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/audit/index.test.ts`:
```typescript
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Lead } from "@/types/audit";

const lead: Lead = { email: "matt@brightsmile.com", firstName: "Matt", domain: "brightsmile.com" };

const htmlSignals = {
  hasMetaPixel: false, hasGoogleAnalytics: true, hasGoogleAds: false, hasBookingWidget: false,
  hasTestimonials: true, hasBeforeAfterGallery: false, hasFaq: false, schemaTypes: [],
  hasLiveChat: false, hasHomepageVideo: false, hasPricingInfo: false, hasGoogleReviews: false,
  hasTeamPage: true, isMultilingual: false, servicePageCount: 3, hasViewportMeta: true,
  metaTitle: "Bright Smile", metaDescription: null, hasPhone: true, hasAddress: true,
};

describe("runAudit", () => {
  beforeEach(() => { vi.resetModules(); vi.restoreAllMocks(); });

  it("happy path: posts the AI-generated email to GHL", async () => {
    const postAuditToGHL = vi.fn().mockResolvedValue(undefined);
    vi.doMock("@/lib/audit/domain", () => ({ resolveReachableUrl: async () => "https://brightsmile.com/" }));
    vi.doMock("@/lib/audit/scrape", () => ({ fetchHtml: async () => "<html></html>", parseSignals: () => htmlSignals }));
    vi.doMock("@/lib/audit/pagespeed", () => ({ fetchPageSpeed: async () => null }));
    vi.doMock("@/lib/audit/ai", () => ({ generateAuditEmail: async () => ({ subject: "AI subject", body: "AI body" }) }));
    vi.doMock("@/lib/ghl", () => ({ postAuditToGHL }));

    const { runAudit } = await import("@/lib/audit/index");
    await runAudit(lead);

    expect(postAuditToGHL).toHaveBeenCalledOnce();
    expect(postAuditToGHL).toHaveBeenCalledWith({
      email: "matt@brightsmile.com",
      first_name: "Matt",
      ai_email_subject: "AI subject",
      ai_email_body: "AI body",
    });
  });

  it("unreachable site: posts a fallback email to GHL", async () => {
    const postAuditToGHL = vi.fn().mockResolvedValue(undefined);
    vi.doMock("@/lib/audit/domain", () => ({ resolveReachableUrl: async () => null }));
    vi.doMock("@/lib/ghl", () => ({ postAuditToGHL }));

    const { runAudit } = await import("@/lib/audit/index");
    await runAudit(lead);

    expect(postAuditToGHL).toHaveBeenCalledOnce();
    const arg = postAuditToGHL.mock.calls[0][0];
    expect(arg.email).toBe("matt@brightsmile.com");
    expect(arg.ai_email_body).toContain("Matt");
  });

  it("AI failure: posts a fallback email to GHL", async () => {
    const postAuditToGHL = vi.fn().mockResolvedValue(undefined);
    vi.doMock("@/lib/audit/domain", () => ({ resolveReachableUrl: async () => "https://brightsmile.com/" }));
    vi.doMock("@/lib/audit/scrape", () => ({ fetchHtml: async () => "<html></html>", parseSignals: () => htmlSignals }));
    vi.doMock("@/lib/audit/pagespeed", () => ({ fetchPageSpeed: async () => null }));
    vi.doMock("@/lib/audit/ai", () => ({ generateAuditEmail: async () => { throw new Error("claude down"); } }));
    vi.doMock("@/lib/ghl", () => ({ postAuditToGHL }));

    const { runAudit } = await import("@/lib/audit/index");
    await runAudit(lead);

    expect(postAuditToGHL).toHaveBeenCalledOnce();
    expect(postAuditToGHL.mock.calls[0][0].ai_email_body).toContain("specialist");
  });

  it("never throws, even if GHL itself fails", async () => {
    vi.doMock("@/lib/audit/domain", () => ({ resolveReachableUrl: async () => null }));
    vi.doMock("@/lib/ghl", () => ({ postAuditToGHL: vi.fn().mockRejectedValue(new Error("ghl down")) }));
    const { runAudit } = await import("@/lib/audit/index");
    await expect(runAudit(lead)).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- tests/lib/audit/index.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Implement lib/audit/index.ts**

```typescript
import type { Lead, Signals, AuditEmail } from "@/types/audit";
import { resolveReachableUrl } from "@/lib/audit/domain";
import { fetchHtml, parseSignals } from "@/lib/audit/scrape";
import { fetchPageSpeed } from "@/lib/audit/pagespeed";
import { generateAuditEmail } from "@/lib/audit/ai";
import { generateFallbackEmail } from "@/lib/audit/fallback";
import { postAuditToGHL } from "@/lib/ghl";

/**
 * Runs the full audit pipeline for one lead and delivers the result to GHL.
 * Never throws: any failure is caught, logged, and turned into a graceful
 * fallback email so the lead always receives something. Designed to be called
 * from `after()` in the lead route — fire-and-forget background work.
 */
export async function runAudit(lead: Lead): Promise<void> {
  let email: AuditEmail;

  try {
    const url = await resolveReachableUrl(lead.domain);
    if (!url) {
      console.warn("[audit] unreachable domain", { domain: lead.domain });
      email = generateFallbackEmail(lead, "site unreachable");
    } else {
      const html = await fetchHtml(url);
      if (!html || html.trim().length < 200) {
        console.warn("[audit] empty/thin HTML", { url });
        email = generateFallbackEmail(lead, "thin or empty HTML");
      } else {
        const [htmlSignals, pagespeed] = await Promise.all([
          Promise.resolve(parseSignals(html, url)),
          fetchPageSpeed(url),
        ]);
        const signals: Signals = {
          url,
          isHttps: url.startsWith("https://"),
          html: htmlSignals,
          pagespeed,
        };
        try {
          email = await generateAuditEmail(signals, lead);
          console.info("[audit] success", { domain: lead.domain, url });
        } catch (e) {
          console.error("[audit] AI generation failed", { domain: lead.domain, error: String(e) });
          email = generateFallbackEmail(lead, "AI generation failed");
        }
      }
    }
  } catch (e) {
    console.error("[audit] pipeline error", { domain: lead.domain, error: String(e) });
    email = generateFallbackEmail(lead, "pipeline error");
  }

  try {
    await postAuditToGHL({
      email: lead.email,
      first_name: lead.firstName,
      ai_email_subject: email.subject,
      ai_email_body: email.body,
    });
  } catch (e) {
    // Last line of defense — log and swallow so `after()` never sees a rejection.
    console.error("[audit] GHL delivery failed", { domain: lead.domain, error: String(e) });
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- tests/lib/audit/index.test.ts
```
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/audit/index.ts tests/lib/audit/index.test.ts
git commit -m "feat(audit): runAudit orchestrator — never throws, always delivers an email"
```

---

## Phase 3 — Wiring

### Task 12: Wire `/api/lead` to the pipeline

**Files:**
- Modify: `app/api/lead/route.ts`
- Modify: `tests/api/lead.test.ts`

- [ ] **Step 1: Replace app/api/lead/route.ts**

```typescript
import { NextResponse, after } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { checkLimit, clientIp, leadLimiter } from "@/lib/ratelimit";
import { runAudit } from "@/lib/audit/index";
import { extractDomain } from "@/lib/audit/domain";
import type { Lead } from "@/types/audit";

// The audit runs in the background via after(); give the function room to finish.
export const maxDuration = 300;

const BLOCKED_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.fr", "ymail.com",
  "outlook.com", "hotmail.com", "live.com", "msn.com",
  "icloud.com", "me.com", "mac.com",
  "proton.me", "protonmail.com",
  "aol.com", "gmx.com", "mail.com",
]);

const BodySchema = z.object({
  email: z.string().email(),
  first_name: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(), // honeypot
});

export async function POST(req: Request) {
  const ip = clientIp(req);
  const limit = await checkLimit(leadLimiter, ip);
  if (!limit.success) return NextResponse.json({ error: "Too many submissions" }, { status: 429 });

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid email" }, { status: 400 });

  // Honeypot: silently accept (200) but do nothing — bots think they succeeded.
  if (parsed.data.website && parsed.data.website.trim().length > 0) {
    return NextResponse.json({ ok: true });
  }

  const domain = extractDomain(parsed.data.email);
  if (BLOCKED_DOMAINS.has(domain)) {
    return NextResponse.json({ error: "Please use a work email address." }, { status: 400 });
  }

  const lead: Lead = {
    email: parsed.data.email,
    firstName: parsed.data.first_name || "",
    phone: parsed.data.phone,
    domain,
    userAgent: req.headers.get("user-agent") || "",
    ipHash: crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16),
  };

  // Respond immediately; the audit pipeline runs in the background.
  after(() => runAudit(lead));

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Replace tests/api/lead.test.ts**

```typescript
// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";

const runAudit = vi.fn().mockResolvedValue(undefined);
const afterCb: Array<() => void> = [];

beforeEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  runAudit.mockClear();
  afterCb.length = 0;
});

vi.mock("next/server", async (orig) => {
  const actual = await orig<typeof import("next/server")>();
  return {
    ...actual,
    after: (cb: () => void) => { afterCb.push(cb); },
  };
});
vi.mock("@/lib/audit/index", () => ({ runAudit }));

function mkReq(body: unknown): Request {
  return new Request("http://localhost/api/lead", {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "test/1.0", "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/lead", () => {
  it("schedules runAudit for a valid work email", async () => {
    const { POST } = await import("@/app/api/lead/route");
    const res = await POST(mkReq({ email: "matt@clinicabc.com", first_name: "Matt" }));
    expect(res.status).toBe(200);
    expect(afterCb).toHaveLength(1);
    afterCb[0]();
    expect(runAudit).toHaveBeenCalledOnce();
    expect(runAudit.mock.calls[0][0]).toMatchObject({ email: "matt@clinicabc.com", firstName: "Matt", domain: "clinicabc.com" });
  });

  it("rejects generic email domains", async () => {
    const { POST } = await import("@/app/api/lead/route");
    const res = await POST(mkReq({ email: "matt@gmail.com" }));
    expect(res.status).toBe(400);
    expect(afterCb).toHaveLength(0);
  });

  it("rejects an invalid/missing email", async () => {
    const { POST } = await import("@/app/api/lead/route");
    const res = await POST(mkReq({ phone: "+1234" }));
    expect(res.status).toBe(400);
  });

  it("silently accepts a honeypot fill without scheduling an audit", async () => {
    const { POST } = await import("@/app/api/lead/route");
    const res = await POST(mkReq({ email: "matt@clinicabc.com", website: "spam" }));
    expect(res.status).toBe(200);
    expect(afterCb).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Run the full test suite**

```bash
npm test
```
Expected: all suites PASS (the lead route, ghl, audit modules, plus the pre-existing auth/content suites).

- [ ] **Step 4: Commit**

```bash
git add app/api/lead/route.ts tests/api/lead.test.ts
git commit -m "feat(audit): /api/lead runs the audit pipeline in the background via after()"
```

---

### Task 13: Prompts API route (`app/api/prompts/route.ts`)

**Files:**
- Create: `app/api/prompts/route.ts`

- [ ] **Step 1: Implement app/api/prompts/route.ts**

```typescript
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, SESSION_CONFIG } from "@/lib/auth";
import { PromptsSchema } from "@/types/prompts";
import { loadPrompts } from "@/lib/audit/prompts";
import { savePrompts, deletePrompts } from "@/lib/blob";

async function requireSession() {
  const c = await cookies();
  const token = c.get(SESSION_CONFIG.cookieName)?.value;
  return token ? await verifySession(token) : null;
}

export async function GET() {
  if (!(await requireSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const prompts = await loadPrompts();
  return NextResponse.json({ prompts });
}

export async function PUT(req: Request) {
  if (!(await requireSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = PromptsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid prompts", issues: parsed.error.issues }, { status: 400 });
  }
  await savePrompts(parsed.data);
  return NextResponse.json({ ok: true });
}

// Reset to the bundled default: delete the Blob copy so loadPrompts() falls back.
export async function DELETE() {
  if (!(await requireSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await deletePrompts();
  const prompts = await loadPrompts(); // now returns the bundled default
  return NextResponse.json({ ok: true, prompts });
}
```

- [ ] **Step 2: Build check**

```bash
npm run build
```
Expected: succeeds; `/api/prompts` appears in the route table.

- [ ] **Step 3: Commit**

```bash
git add app/api/prompts
git commit -m "feat(admin): /api/prompts GET/PUT — load + save audit prompts"
```

---

### Task 14: Admin prompt editor (`app/admin/funnel/`)

**Files:**
- Create: `app/admin/funnel/_components/PromptEditor.tsx`
- Replace: `app/admin/funnel/page.tsx`

- [ ] **Step 1: Create the PromptEditor client component**

Create `app/admin/funnel/_components/PromptEditor.tsx`:
```tsx
"use client";
import { useEffect, useState } from "react";
import { useToast } from "../../../_components/Toast";
import { ConfirmDialog } from "../../../_components/ConfirmDialog";

type Prompts = {
  version: number;
  system_prompt: string;
  email_instructions: string;
  subject_instructions: string;
  tone: string;
  signature: string;
};

const FIELDS: { key: keyof Omit<Prompts, "version">; label: string; hint: string; rows: number }[] = [
  { key: "system_prompt", label: "System prompt", hint: "Who Claude is and how it should think about the audit.", rows: 5 },
  { key: "email_instructions", label: "Email body instructions", hint: "How the email body should be structured and written.", rows: 5 },
  { key: "subject_instructions", label: "Subject line instructions", hint: "How the subject line should be written.", rows: 3 },
  { key: "tone", label: "Tone", hint: "The voice of the email.", rows: 2 },
  { key: "signature", label: "Signature", hint: "How the email signs off.", rows: 1 },
];

export function PromptEditor() {
  const { toast } = useToast();
  const [prompts, setPrompts] = useState<Prompts | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    fetch("/api/prompts")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((b) => setPrompts(b.prompts))
      .catch(() => toast("error", "Could not load the prompts"));
  }, [toast]);

  async function save(next: Prompts) {
    setSaving(true);
    const res = await fetch("/api/prompts", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(next),
    });
    setSaving(false);
    if (res.ok) toast("success", "Prompts saved — the next audit will use them");
    else toast("error", "Could not save the prompts");
  }

  async function resetToDefault() {
    setConfirmReset(false);
    const res = await fetch("/api/prompts", { method: "DELETE" });
    if (res.ok) {
      const b = await res.json();
      setPrompts(b.prompts);
      toast("success", "Reset to the default prompts");
    } else {
      toast("error", "Could not reset the prompts");
    }
  }

  if (!prompts) return <p style={{ color: "#71717a" }}>Loading…</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 720 }}>
      {FIELDS.map((f) => (
        <div key={f.key}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#27272a", marginBottom: 2 }}>
            {f.label}
          </label>
          <div style={{ fontSize: 12, color: "#a1a1aa", marginBottom: 6 }}>{f.hint}</div>
          <textarea
            value={prompts[f.key]}
            rows={f.rows}
            onChange={(e) => setPrompts({ ...prompts, [f.key]: e.target.value })}
            style={{
              width: "100%", padding: "10px 12px", border: "1px solid #d4d4d8",
              borderRadius: 8, fontSize: 13, fontFamily: "var(--adv-font, system-ui)",
              resize: "vertical", boxSizing: "border-box", lineHeight: 1.5,
            }}
          />
        </div>
      ))}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => save(prompts)}
          disabled={saving}
          style={{
            background: "#18181b", color: "#fff", border: 0, padding: "9px 18px",
            borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "Saving…" : "Save prompts"}
        </button>
        <button
          onClick={() => setConfirmReset(true)}
          style={{
            background: "transparent", color: "#27272a", border: "1px solid #e7e7ea",
            padding: "9px 18px", borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: "pointer",
          }}
        >
          Reset to default
        </button>
      </div>
      <ConfirmDialog
        open={confirmReset}
        title="Reset to the default prompts?"
        description="This deletes your customized prompts and restores the built-in defaults. Any unsaved edits in the editor are also discarded."
        confirmLabel="Reset to default"
        cancelLabel="Keep my prompts"
        destructive
        onConfirm={resetToDefault}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Replace app/admin/funnel/page.tsx**

```tsx
import { BackLink } from "../_components/BackLink";
import { PromptEditor } from "./_components/PromptEditor";

export default function FunnelPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <BackLink />
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 600, margin: "0 0 6px", letterSpacing: "-0.01em" }}>
          AI Audit prompts
        </h1>
        <p style={{ color: "#71717a", margin: 0, fontSize: 15, lineHeight: 1.5, maxWidth: 620 }}>
          When a visitor submits their work email, the system audits their website and Claude
          writes them a personalized email. These prompts control how that email is written.
          Edits take effect on the next audit — no deploy needed.
        </p>
      </div>
      <PromptEditor />
    </div>
  );
}
```

- [ ] **Step 3: Build + manual smoke test**

```bash
npm run build
```
Expected: succeeds.

Then run the dev server (`PORT=3030 npm run dev` in the background), log in at `/admin/login`, visit `/admin/funnel`:
- The editor loads the bundled default prompts
- Edit a field, click "Save prompts" → success toast
- (Saving requires `BLOB_READ_WRITE_TOKEN` in `.env.local` — it is already present from the v1 work)

- [ ] **Step 4: Commit**

```bash
git add app/admin/funnel
git commit -m "feat(admin): AI Audit prompt editor (live edit, no deploy)"
```

---

## Phase 4 — Verification & deploy

### Task 15: Final verification

**Files:** (verification only)

- [ ] **Step 1: Typecheck**

```bash
npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 2: Full test suite**

```bash
npm test
```
Expected: all suites pass — auth, content, github, ghl (reworked), and all `lib/audit/*` suites, plus the lead route.

- [ ] **Step 3: Production build**

```bash
rm -rf .next && npm run build
```
Expected: succeeds. `/api/lead`, `/api/prompts` in the route table. `/api/lead` should show `maxDuration` respected (no warning).

- [ ] **Step 4: Grep for leftover references to removed symbols**

```bash
grep -rn "postLeadToGHL\|GHL_LEAD_WEBHOOK_URL\|LeadPayload\|AuditPayload" app/ lib/ tests/ || echo "clean — no stale references"
```
Expected: `clean — no stale references`. If anything shows up, fix it.

- [ ] **Step 5: Commit verification marker**

```bash
git commit --allow-empty -m "chore(audit): v1.1 verification — typecheck, tests, build all green"
```

---

### Task 16: Deploy

**Files:** (deployment only)

- [ ] **Step 1: Push to GitHub**

```bash
git push origin main
```
(If push auth is needed, the user handles it — do not embed tokens.)

- [ ] **Step 2: Add the new environment variables on Vercel**

These must be added by the user (secrets — never paste them in chat or commits):
```bash
echo 'sk-ant-...'      | vercel env add ANTHROPIC_API_KEY production
echo '<psi-key>'       | vercel env add GOOGLE_PAGESPEED_API_KEY production
echo '<ghl-audit-url>' | vercel env add GHL_AUDIT_WEBHOOK_URL production
```
`GOOGLE_PAGESPEED_API_KEY` is optional (the pipeline degrades gracefully without it). `ANTHROPIC_API_KEY` and `GHL_AUDIT_WEBHOOK_URL` are required for the pipeline to function.

The `GHL_AUDIT_WEBHOOK_URL` value is the Inbound Webhook URL from Nik's "Audit Email" workflow:
`https://services.leadconnectorhq.com/hooks/3ezcGJ9PDAnOWUPCNABa/webhook-trigger/bGIMuaCYKEfSju3PRfDT`

- [ ] **Step 3: Update .env.example**

Append to `.env.example`:
```
# AI Audit Tool — REQUIRED for the audit pipeline
ANTHROPIC_API_KEY=sk-ant-...
GHL_AUDIT_WEBHOOK_URL=https://services.leadconnectorhq.com/hooks/.../webhook-trigger/...

# AI Audit Tool — OPTIONAL (pipeline degrades gracefully without it)
GOOGLE_PAGESPEED_API_KEY=
```
Commit:
```bash
git add .env.example
git commit -m "docs: document AI audit env vars in .env.example"
```

- [ ] **Step 4: Deploy to production**

```bash
vercel deploy --prod --yes
```

- [ ] **Step 5: Smoke test in production**

Submit a real work email on the live landing form (`https://advanguard.vercel.app`) using a domain you control. Within ~1-2 minutes:
- The GHL "Audit Email" workflow fires
- A contact is created
- An audit email is delivered

Check `vercel logs` for the `[audit]` structured log lines confirming the pipeline ran.

---

## Self-review checklist

After implementation:

- [ ] All tasks 1-16 complete
- [ ] `npm test` passes (every `lib/audit/*` suite + ghl + lead route + pre-existing suites)
- [ ] `npm run build` succeeds
- [ ] `npx tsc --noEmit` clean
- [ ] No stale references to `postLeadToGHL` / `GHL_LEAD_WEBHOOK_URL` / `LeadPayload` / `AuditPayload`
- [ ] `runAudit` never throws — every failure path produces a fallback email
- [ ] The lead always receives an email (success or graceful fallback)
- [ ] Prompts are editable from `/admin/funnel` and take effect without a deploy
- [ ] Env vars documented in `.env.example`, added on Vercel
- [ ] Production smoke test: real submission → audit email delivered

## Out of scope for v1.1 (do not implement)

- Browser rendering for JS-heavy sites (flag for manual review instead)
- A "is this a clinic?" classifier
- Audit history / database (leads live in GoHighLevel)
- A "test this prompt" button in the admin
- Email follow-up sequences
- A durable retry queue (Vercel Queues)
