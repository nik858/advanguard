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
