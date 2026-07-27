import { describe, it, expect } from "vitest";
import { LANDING_VARIANTS, VARIANTS, parseVariant } from "@/lib/landing/variants";

describe("landing variants", () => {
  it("exposes exactly the free and premium pages", () => {
    expect([...LANDING_VARIANTS]).toEqual(["free", "premium"]);
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

  it("never lets the two variants share a storage location", () => {
    const files = LANDING_VARIANTS.map((v) => VARIANTS[v].contentFile);
    const drafts = LANDING_VARIANTS.map((v) => VARIANTS[v].draftKey);
    const stores = LANDING_VARIANTS.map((v) => VARIANTS[v].storageKey);
    expect(new Set(files).size).toBe(files.length);
    expect(new Set(drafts).size).toBe(drafts.length);
    expect(new Set(stores).size).toBe(stores.length);
  });

  it("falls back to the free page for anything unrecognised", () => {
    expect(parseVariant("premium")).toBe("premium");
    expect(parseVariant("free")).toBe("free");
    expect(parseVariant("../../etc/passwd")).toBe("free");
    expect(parseVariant(null)).toBe("free");
    expect(parseVariant(undefined)).toBe("free");
    expect(parseVariant("")).toBe("free");
  });
});
