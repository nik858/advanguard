// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PromptsV2Schema, parsePromptsPayload } from "@/types/prompts";
import promptsJson from "@/content/prompts.json";

describe("bundled prompts.json", () => {
  it("matches PromptsV2Schema", () => {
    const result = PromptsV2Schema.safeParse(promptsJson);
    if (!result.success) console.error(result.error.issues);
    expect(result.success).toBe(true);
  });
});

describe("loadPrompts", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns the bundled v2 default when Blob is empty", async () => {
    vi.doMock("@/lib/blob", () => ({ loadPromptsBlob: async () => null }));
    const { loadPrompts } = await import("@/lib/audit/prompts");
    const p = await loadPrompts();
    expect(p.version).toBe(2);
    expect(p.shared.system_prompt.length).toBeGreaterThan(0);
    expect(p.emails.mail_1.delay_hours).toBe(0);
    expect(p.emails.mail_2.delay_hours).toBe(24);
    expect(p.emails.mail_3.delay_hours).toBe(48);
  });

  it("returns the Blob version when present and valid v2", async () => {
    const custom = {
      version: 2,
      shared: { system_prompt: "custom sys", tone: "custom tone", signature: "Custom Sig" },
      html_template: "<html><body>{{body_html}}</body></html>",
      emails: {
        mail_1: { delay_hours: 0, email_instructions: "instr 1", subject_instructions: "subj 1" },
        mail_2: { delay_hours: 12, email_instructions: "instr 2", subject_instructions: "subj 2" },
        mail_3: { delay_hours: 36, email_instructions: "instr 3", subject_instructions: "subj 3" },
      },
    };
    vi.doMock("@/lib/blob", () => ({ loadPromptsBlob: async () => custom }));
    const { loadPrompts } = await import("@/lib/audit/prompts");
    const p = await loadPrompts();
    expect(p.version).toBe(2);
    expect(p.shared.system_prompt).toBe("custom sys");
    expect(p.emails.mail_2.delay_hours).toBe(12);
  });

  it("falls back to bundled default when the Blob version is invalid", async () => {
    vi.doMock("@/lib/blob", () => ({ loadPromptsBlob: async () => ({ garbage: true }) }));
    const { loadPrompts } = await import("@/lib/audit/prompts");
    const p = await loadPrompts();
    expect(p.version).toBe(2);
  });

  it("migrates a v1 Blob payload to v2 in memory", async () => {
    const v1 = {
      version: 1,
      system_prompt: "v1 sys",
      email_instructions: "v1 body instr",
      subject_instructions: "v1 subj instr",
      tone: "v1 tone",
      signature: "v1 sig",
    };
    vi.doMock("@/lib/blob", () => ({ loadPromptsBlob: async () => v1 }));
    const { loadPrompts } = await import("@/lib/audit/prompts");
    const p = await loadPrompts();
    expect(p.version).toBe(2);
    expect(p.shared.system_prompt).toBe("v1 sys");
    expect(p.shared.tone).toBe("v1 tone");
    expect(p.emails.mail_1.email_instructions).toBe("v1 body instr");
    expect(p.emails.mail_2.delay_hours).toBe(24);
  });
});

describe("parsePromptsPayload", () => {
  it("accepts v2 directly", () => {
    const v2 = PromptsV2Schema.parse(promptsJson);
    const result = parsePromptsPayload(v2);
    expect(result?.version).toBe(2);
  });

  it("migrates v1 to v2", () => {
    const v1 = {
      version: 1,
      system_prompt: "sys",
      email_instructions: "instr",
      subject_instructions: "subj",
      tone: "tone",
      signature: "sig",
    };
    const result = parsePromptsPayload(v1);
    expect(result?.version).toBe(2);
    expect(result?.emails.mail_1.email_instructions).toBe("instr");
  });

  it("returns null on garbage", () => {
    expect(parsePromptsPayload({ foo: "bar" })).toBeNull();
  });
});
