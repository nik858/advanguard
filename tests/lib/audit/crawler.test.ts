// @vitest-environment node
import { describe, it, expect } from "vitest";
import { parseSitemapXml, classifyPage } from "@/lib/audit/crawler";

describe("parseSitemapXml", () => {
  it("extracts every <loc> URL", () => {
    const xml = `<?xml version="1.0"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://acme.com/</loc></url>
        <url><loc>https://acme.com/services/implants</loc></url>
        <url><loc>https://acme.com/team</loc></url>
      </urlset>`;
    expect(parseSitemapXml(xml)).toEqual([
      "https://acme.com/",
      "https://acme.com/services/implants",
      "https://acme.com/team",
    ]);
  });

  it("returns an empty array on empty input", () => {
    expect(parseSitemapXml("")).toEqual([]);
  });

  it("handles sitemap-index (nested <loc>)", () => {
    const xml = `<sitemapindex>
      <sitemap><loc>https://acme.com/sitemap-1.xml</loc></sitemap>
      <sitemap><loc>https://acme.com/sitemap-2.xml</loc></sitemap>
    </sitemapindex>`;
    expect(parseSitemapXml(xml)).toEqual([
      "https://acme.com/sitemap-1.xml",
      "https://acme.com/sitemap-2.xml",
    ]);
  });
});

describe("classifyPage", () => {
  it("classifies the homepage", () => {
    expect(classifyPage("https://acme.com/", "Home", true)).toBe("homepage");
  });

  it("classifies service pages by URL slug", () => {
    expect(classifyPage("https://acme.com/services/implants", "Dental Implants", false)).toBe("service");
    expect(classifyPage("https://acme.com/treatments/botox", "Botox", false)).toBe("service");
    expect(classifyPage("https://acme.com/all-on-4-dental-implants", "All-on-4", false)).toBe("service");
  });

  it("classifies team / about pages", () => {
    expect(classifyPage("https://acme.com/our-doctors", "Our Doctors", false)).toBe("team");
    expect(classifyPage("https://acme.com/about", "About Us", false)).toBe("team");
  });

  it("classifies faq pages", () => {
    expect(classifyPage("https://acme.com/faq", "Questions", false)).toBe("faq");
    expect(classifyPage("https://acme.com/help", "FAQ — Frequently Asked", false)).toBe("faq");
  });

  it("classifies testimonials pages", () => {
    expect(classifyPage("https://acme.com/testimonials", "Patient stories", false)).toBe("testimonials");
    expect(classifyPage("https://acme.com/reviews", "Reviews", false)).toBe("testimonials");
  });

  it("falls back to 'other' when nothing matches", () => {
    expect(classifyPage("https://acme.com/contact", "Contact", false)).toBe("other");
    expect(classifyPage("https://acme.com/privacy", "Privacy", false)).toBe("other");
  });
});
