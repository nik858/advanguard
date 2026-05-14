import { describe, it, expect } from "vitest";
import { migrateContent, ContentSchemaV2 } from "@/types/content";
import contentJson from "@/content/content.json";

describe("migrateContent", () => {
  it("converts the v1 content.json into a valid v2 document", () => {
    const v2 = migrateContent(contentJson);
    expect(ContentSchemaV2.safeParse(v2).success).toBe(true);
    expect(v2.version).toBe(2);
  });

  it("produces the 9 body sections in canonical order", () => {
    const v2 = migrateContent(contentJson);
    expect(v2.sections.map((s) => s.type)).toEqual([
      "headline", "hero", "authority", "onlySystem", "demo",
      "testimonials", "stack", "guarantee", "faq",
    ]);
  });

  it("bundles hero + order into the hero section's data", () => {
    const v2 = migrateContent(contentJson);
    const hero = v2.sections.find((s) => s.type === "hero");
    expect(hero?.data).toHaveProperty("hero");
    expect(hero?.data).toHaveProperty("order");
  });

  it("keeps meta, header and footer at the top level unchanged", () => {
    const raw = contentJson as Record<string, unknown>;
    const v2 = migrateContent(contentJson);
    expect(v2.meta).toEqual(raw.meta);
    expect(v2.header).toEqual(raw.header);
    expect(v2.footer).toEqual(raw.footer);
  });

  it("is deterministic — two migrations of the same input are equal", () => {
    expect(migrateContent(contentJson)).toEqual(migrateContent(contentJson));
  });

  it("is idempotent on an already-v2 document", () => {
    const once = migrateContent(contentJson);
    expect(migrateContent(once)).toEqual(once);
  });

  it("throws on an unrecognisable shape", () => {
    expect(() => migrateContent({ foo: "bar" })).toThrow();
  });
});
