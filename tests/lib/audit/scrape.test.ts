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
  it("detects social profiles", () => {
    expect(s.socialProfiles).toContain("instagram");
    expect(s.socialProfiles).toContain("facebook");
  });
  it("detects a contact form", () => { expect(s.hasContactForm).toBe(true); });
  it("detects Open Graph tags and favicon", () => {
    expect(s.hasOpenGraph).toBe(true);
    expect(s.hasFavicon).toBe(true);
  });
  it("counts H1 headings", () => { expect(s.h1Count).toBe(1); });
  it("counts images, missing alt text, and formats", () => {
    expect(s.imageCount).toBe(3);
    expect(s.imagesWithoutAlt).toBe(1);
    expect(s.imageFormats.jpeg).toBe(2);
    expect(s.imageFormats.webp).toBe(1);
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
    expect(s.socialProfiles).toEqual([]);
    expect(s.hasContactForm).toBe(false);
    expect(s.hasOpenGraph).toBe(false);
    expect(s.imageCount).toBe(0);
  });
});
