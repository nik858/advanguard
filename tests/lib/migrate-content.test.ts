import { describe, it, expect } from "vitest";
import { migrateContent, ContentSchemaV2 } from "@/types/content";
import contentJson from "@/content/content.json";

// content/content.json is a *v2* document that the admin actively edits
// (sections get reordered, duplicated, removed). To exercise the v1 -> v2
// migration path we flatten it back into a v1-shaped object: meta/header/
// footer at the top level, plus one key per section's data. A duplicated
// section simply collapses onto the same key, which is exactly the v1 shape.
function toV1Shape(v2: unknown): Record<string, unknown> {
  const doc = v2 as { meta: unknown; header: unknown; footer: unknown; sections: { data: Record<string, unknown> }[] };
  const flat: Record<string, unknown> = { meta: doc.meta, header: doc.header, footer: doc.footer };
  for (const section of doc.sections) Object.assign(flat, section.data);
  return flat;
}

const v1 = toV1Shape(migrateContent(contentJson));

describe("migrateContent", () => {
  it("converts a v1 document into a valid v2 document", () => {
    const v2 = migrateContent(v1);
    expect(ContentSchemaV2.safeParse(v2).success).toBe(true);
    expect(v2.version).toBe(2);
  });

  it("produces the 9 body sections in canonical order", () => {
    const v2 = migrateContent(v1);
    expect(v2.sections.map((s) => s.type)).toEqual([
      "headline", "hero", "authority", "onlySystem", "demo",
      "testimonials", "stack", "guarantee", "faq",
    ]);
  });

  it("bundles hero + order into the hero section's data", () => {
    const v2 = migrateContent(v1);
    const hero = v2.sections.find((s) => s.type === "hero");
    expect(hero?.data).toHaveProperty("hero");
    expect(hero?.data).toHaveProperty("order");
  });

  it("keeps meta, header and footer at the top level unchanged", () => {
    const v2 = migrateContent(v1);
    expect(v2.meta).toEqual(v1.meta);
    expect(v2.header).toEqual(v1.header);
    expect(v2.footer).toEqual(v1.footer);
  });

  it("is deterministic — two migrations of the same input are equal", () => {
    expect(migrateContent(v1)).toEqual(migrateContent(v1));
  });

  it("is idempotent on an already-v2 document", () => {
    const once = migrateContent(contentJson);
    expect(migrateContent(once)).toEqual(once);
  });

  it("throws on an unrecognisable shape", () => {
    expect(() => migrateContent({ foo: "bar" })).toThrow();
  });
});
