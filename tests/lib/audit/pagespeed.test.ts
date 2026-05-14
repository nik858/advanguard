// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

function psiResponse(performance: number, seo: number) {
  return {
    loadingExperience: {
      overall_category: "SLOW",
      metrics: {
        LARGEST_CONTENTFUL_PAINT_MS: { percentile: 4200, category: "SLOW" },
        CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: 8, category: "AVERAGE" },
        INTERACTION_TO_NEXT_PAINT: { percentile: 250, category: "AVERAGE" },
        FIRST_CONTENTFUL_PAINT_MS: { percentile: 2100, category: "AVERAGE" },
      },
    },
    lighthouseResult: {
      stackPacks: [
        {
          id: "wordpress",
          title: "WordPress",
          descriptions: {
            "uses-responsive-images": "Upload images through the [WordPress media library](https://example.com) to serve correct sizes.",
          },
        },
      ],
      categories: {
        performance: {
          score: performance,
          auditRefs: [
            { id: "largest-contentful-paint" },
            { id: "uses-responsive-images" },
            { id: "dom-size" },
          ],
        },
        seo: { score: seo, auditRefs: [{ id: "meta-description" }] },
        accessibility: { score: 0.9, auditRefs: [{ id: "image-alt" }] },
        "best-practices": { score: 0.83, auditRefs: [] },
      },
      audits: {
        "largest-contentful-paint": { numericValue: 2500, score: 0.4, scoreDisplayMode: "numeric", title: "Largest Contentful Paint" },
        "cumulative-layout-shift": { numericValue: 0.05 },
        "interaction-to-next-paint": { numericValue: 180 },
        "first-contentful-paint": { numericValue: 1800 },
        "total-blocking-time": { numericValue: 540 },
        "speed-index": { numericValue: 6800 },
        // A perf opportunity (fix with an estimated time saving).
        "uses-responsive-images": {
          title: "Properly size images",
          description: "Serve appropriately-sized images. [Learn more](https://example.com).",
          displayValue: "Est savings of 189 KiB",
          score: 0.25,
          scoreDisplayMode: "metricSavings",
          details: { type: "opportunity", overallSavingsMs: 1200, overallSavingsBytes: 193536 },
        },
        // A failed perf diagnostic (no savings).
        "dom-size": { title: "Avoid an excessive DOM size", description: "A large DOM slows things down.", displayValue: "1,847 elements", score: 0, scoreDisplayMode: "numeric" },
        // A failed SEO audit.
        "meta-description": { title: "Document does not have a meta description", description: "Meta descriptions improve search snippets.", score: 0, scoreDisplayMode: "binary" },
        // A failed accessibility audit.
        "image-alt": { title: "Image elements do not have [alt] attributes", description: "Alt text helps screen readers.", score: 0, scoreDisplayMode: "binary" },
      },
    },
  };
}

describe("fetchPageSpeed", () => {
  beforeEach(() => { vi.restoreAllMocks(); vi.resetModules(); });

  async function run() {
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(psiResponse(0.42, 0.8)), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(psiResponse(0.91, 0.85)), { status: 200 }));
    const { fetchPageSpeed } = await import("@/lib/audit/pagespeed");
    return (await fetchPageSpeed("https://example.com"))!;
  }

  it("returns merged mobile + desktop signals", async () => {
    const r = await run();
    expect(r.mobilePerformance).toBe(42);
    expect(r.desktopPerformance).toBe(91);
    expect(r.lcp).toBeCloseTo(2.5);
    expect(r.seoScore).toBe(80);
  });

  it("extracts lab metrics and category scores", async () => {
    const r = await run();
    expect(r.fcp).toBeCloseTo(1.8);
    expect(r.tbt).toBe(540);
    expect(r.speedIndex).toBeCloseTo(6.8);
    expect(r.bestPracticesScore).toBe(83);
  });

  it("extracts Lighthouse opportunities, sorted by estimated saving", async () => {
    const r = await run();
    expect(r.opportunities).toEqual([
      {
        title: "Properly size images",
        description: "Serve appropriately-sized images. Learn more.",
        savingsMs: 1200,
        savingsBytes: 193536,
        displayValue: "Est savings of 189 KiB",
      },
    ]);
  });

  it("extracts failed audits across categories, excluding opportunities", async () => {
    const r = await run();
    const titles = r.failedAudits.map((f) => f.title);
    expect(titles).toContain("Avoid an excessive DOM size");
    expect(titles).toContain("Document does not have a meta description");
    expect(titles).toContain("Image elements do not have [alt] attributes");
    // The opportunity must not be duplicated into failedAudits.
    expect(titles).not.toContain("Properly size images");
    const seo = r.failedAudits.find((f) => f.title.includes("meta description"));
    expect(seo!.category).toBe("seo");
    const dom = r.failedAudits.find((f) => f.title.includes("DOM"));
    expect(dom!.displayValue).toBe("1,847 elements");
  });

  it("extracts CrUX real-user field data", async () => {
    const r = await run();
    expect(r.field).not.toBeNull();
    expect(r.field!.overall).toBe("SLOW");
    expect(r.field!.lcp).toEqual({ value: 4.2, rating: "SLOW" });
    expect(r.field!.cls).toEqual({ value: 0.08, rating: "AVERAGE" });
    expect(r.field!.inp).toEqual({ value: 250, rating: "AVERAGE" });
  });

  it("extracts the detected platform and platform-specific tips", async () => {
    const r = await run();
    expect(r.detectedPlatform).toBe("WordPress");
    expect(r.platformTips).toEqual([
      "Upload images through the WordPress media library to serve correct sizes.",
    ]);
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
