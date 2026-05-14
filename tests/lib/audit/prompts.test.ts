// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PromptsSchema } from "@/types/prompts";
import promptsJson from "@/content/prompts.json";

describe("bundled prompts.json", () => {
  it("matches PromptsSchema", () => {
    const result = PromptsSchema.safeParse(promptsJson);
    if (!result.success) console.error(result.error.issues);
    expect(result.success).toBe(true);
  });
});

describe("loadPrompts", () => {
  beforeEach(() => { vi.resetModules(); });

  it("returns the bundled default when Blob is empty", async () => {
    vi.doMock("@/lib/blob", () => ({ loadPromptsBlob: async () => null }));
    const { loadPrompts } = await import("@/lib/audit/prompts");
    const p = await loadPrompts();
    expect(p.version).toBe(1);
    expect(p.system_prompt.length).toBeGreaterThan(0);
  });

  it("returns the Blob version when present and valid", async () => {
    const custom = {
      version: 2, system_prompt: "custom sys", email_instructions: "custom email",
      subject_instructions: "custom subj", tone: "custom tone", signature: "Custom Sig",
    };
    vi.doMock("@/lib/blob", () => ({ loadPromptsBlob: async () => custom }));
    const { loadPrompts } = await import("@/lib/audit/prompts");
    const p = await loadPrompts();
    expect(p.version).toBe(2);
    expect(p.system_prompt).toBe("custom sys");
  });

  it("falls back to default when the Blob version is invalid", async () => {
    vi.doMock("@/lib/blob", () => ({ loadPromptsBlob: async () => ({ garbage: true }) }));
    const { loadPrompts } = await import("@/lib/audit/prompts");
    const p = await loadPrompts();
    expect(p.version).toBe(1);
  });
});
