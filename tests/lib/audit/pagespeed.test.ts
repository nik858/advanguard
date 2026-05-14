// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

function psiResponse(performance: number, seo: number) {
  return {
    lighthouseResult: {
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
          displayValue: "Potential savings of 1.2 s",
          score: 0.25,
          scoreDisplayMode: "metricSavings",
          details: { type: "opportunity", overallSavingsMs: 1200 },
        },
        // A failed perf diagnostic (no savings).
        "dom-size": { title: "Avoid an excessive DOM size", score: 0, scoreDisplayMode: "numeric" },
        // A failed SEO audit.
        "meta-description": { title: "Document does not have a meta description", score: 0, scoreDisplayMode: "binary" },
        // A failed accessibility audit.
        "image-alt": { title: "Image elements do not have [alt] attributes", score: 0, scoreDisplayMode: "binary" },
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

  it("extracts lab metrics and category scores", async () => {
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(psiResponse(0.42, 0.8)), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(psiResponse(0.91, 0.85)), { status: 200 }));
    const { fetchPageSpeed } = await import("@/lib/audit/pagespeed");
    const r = await fetchPageSpeed("https://example.com");
    expect(r!.fcp).toBeCloseTo(1.8);
    expect(r!.tbt).toBe(540);
    expect(r!.speedIndex).toBeCloseTo(6.8);
    expect(r!.bestPracticesScore).toBe(83);
  });

  it("extracts Lighthouse opportunities, sorted by estimated saving", async () => {
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(psiResponse(0.42, 0.8)), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(psiResponse(0.91, 0.85)), { status: 200 }));
    const { fetchPageSpeed } = await import("@/lib/audit/pagespeed");
    const r = await fetchPageSpeed("https://example.com");
    expect(r!.opportunities).toEqual([
      { title: "Properly size images", savingsMs: 1200, displayValue: "Potential savings of 1.2 s" },
    ]);
  });

  it("extracts failed audits across categories, excluding opportunities", async () => {
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(psiResponse(0.42, 0.8)), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(psiResponse(0.91, 0.85)), { status: 200 }));
    const { fetchPageSpeed } = await import("@/lib/audit/pagespeed");
    const r = await fetchPageSpeed("https://example.com");
    const titles = r!.failedAudits.map((f) => f.title);
    expect(titles).toContain("Avoid an excessive DOM size");
    expect(titles).toContain("Document does not have a meta description");
    expect(titles).toContain("Image elements do not have [alt] attributes");
    // The opportunity must not be duplicated into failedAudits.
    expect(titles).not.toContain("Properly size images");
    const seo = r!.failedAudits.find((f) => f.title.includes("meta description"));
    expect(seo!.category).toBe("seo");
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
