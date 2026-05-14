import { describe, it, expect } from "vitest";
import { PromptsSchema } from "@/types/prompts";
import promptsJson from "@/content/prompts.json";

describe("bundled prompts.json", () => {
  it("matches PromptsSchema", () => {
    const result = PromptsSchema.safeParse(promptsJson);
    if (!result.success) console.error(result.error.issues);
    expect(result.success).toBe(true);
  });
});
