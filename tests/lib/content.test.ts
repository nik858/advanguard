import { describe, it, expect } from "vitest";
import { ContentSchema, migrateContent } from "@/types/content";
import contentJson from "@/content/content.json";

describe("ContentSchema", () => {
  it("parses content.json (after migration) successfully", () => {
    const migrated = migrateContent(contentJson);
    const result = ContentSchema.safeParse(migrated);
    if (!result.success) console.error(result.error.issues);
    expect(result.success).toBe(true);
  });

  it("rejects content missing required fields", () => {
    const bad = { meta: { title: "x" } };
    expect(ContentSchema.safeParse(bad).success).toBe(false);
  });
});
