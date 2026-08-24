import { describe, it, expect } from "vitest";
import {
  LANDING_VARIANTS,
  PAID_VARIANTS,
  VARIANTS,
  paidConfig,
  parsePaidVariant,
  parseVariant,
} from "@/lib/landing/variants";
import { LEAD_SOURCES } from "@/lib/db/schema";

describe("landing variants", () => {
  it("exposes exactly the free and the two paid pages", () => {
    expect([...LANDING_VARIANTS]).toEqual(["free", "premium", "premium_slo"]);
    expect([...PAID_VARIANTS]).toEqual(["premium", "premium_slo"]);
  });

  it("keeps the free page on its historical content file, draft and storage key", () => {
    // Renaming any of these would orphan Nik's live content or his in-flight draft.
    expect(VARIANTS.free.contentFile).toBe("content/content.json");
    expect(VARIANTS.free.draftKey).toBe("drafts/nik.json");
    expect(VARIANTS.free.storageKey).toBe("adv:draft:v1");
    expect(VARIANTS.free.path).toBe("/");
  });

  it("gives the premium page its own file, draft and storage key", () => {
    expect(VARIANTS.premium.contentFile).toBe("content/content.premium.json");
    expect(VARIANTS.premium.path).toBe("/premium");
  });

  it("keeps the premium page's historical draft and storage key", () => {
    // Same reasoning as the free page: renaming these orphans Nik's draft.
    expect(VARIANTS.premium.draftKey).toBe("drafts/nik.premium.json");
    expect(VARIANTS.premium.storageKey).toBe("adv:draft:v1:premium");
  });

  it("gives the SLO page its own file, draft and storage key", () => {
    expect(VARIANTS.premium_slo.contentFile).toBe("content/content.premium.slo.json");
    expect(VARIANTS.premium_slo.path).toBe("/premium.slo");
    expect(VARIANTS.premium_slo.draftKey).toBe("drafts/nik.premium.slo.json");
  });

  it("never lets two variants share a storage location or a path", () => {
    for (const field of ["contentFile", "draftKey", "storageKey", "path"] as const) {
      const values = LANDING_VARIANTS.map((v) => VARIANTS[v][field]);
      expect(new Set(values).size, `${field} must be unique per variant`).toBe(values.length);
    }
  });

  it("only claims lead sources the leads table declares", () => {
    // fulfillPremiumCheckout casts the session metadata to LeadSource after a
    // runtime membership check — this keeps that cast honest.
    for (const v of PAID_VARIANTS) {
      expect(LEAD_SOURCES).toContain(paidConfig(v).leadSource);
    }
  });

  it("keeps each paid page's lead source, gate key and thank-you page distinct", () => {
    for (const field of ["leadSource", "gateKey", "thankYouPath"] as const) {
      const values = PAID_VARIANTS.map((v) => paidConfig(v)[field]);
      expect(new Set(values).size, `${field} must be unique per paid variant`).toBe(values.length);
    }
  });

  it("puts each thank-you page under its own landing page", () => {
    for (const v of PAID_VARIANTS) {
      expect(paidConfig(v).thankYouPath).toBe(`${VARIANTS[v].path}/thank-you`);
    }
  });

  it("falls back to the free page for anything unrecognised", () => {
    expect(parseVariant("premium")).toBe("premium");
    expect(parseVariant("premium_slo")).toBe("premium_slo");
    expect(parseVariant("free")).toBe("free");
    expect(parseVariant("../../etc/passwd")).toBe("free");
    expect(parseVariant(null)).toBe("free");
    expect(parseVariant(undefined)).toBe("free");
    expect(parseVariant("")).toBe("free");
  });

  it("falls back to the original premium funnel for unknown paid variants", () => {
    // A Checkout session must always land on a real paid page, never on "/".
    expect(parsePaidVariant("premium_slo")).toBe("premium_slo");
    expect(parsePaidVariant("free")).toBe("premium");
    expect(parsePaidVariant("../../etc/passwd")).toBe("premium");
    expect(parsePaidVariant(null)).toBe("premium");
    expect(parsePaidVariant(undefined)).toBe("premium");
    expect(parsePaidVariant("")).toBe("premium");
  });
});
