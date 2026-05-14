// @vitest-environment node
import { describe, it, expect } from "vitest";
import { generateFallbackEmail } from "@/lib/audit/fallback";
import type { Lead } from "@/types/audit";

const lead: Lead = { email: "matt@brightsmile.com", firstName: "Matt", domain: "brightsmile.com" };

describe("generateFallbackEmail", () => {
  it("produces a graceful, non-technical email with a subject and body", () => {
    const email = generateFallbackEmail(lead, "site unreachable");
    expect(email.subject.length).toBeGreaterThan(0);
    expect(email.body).toContain("Matt");
    expect(email.body).toContain("brightsmile.com");
    // never leak the technical reason to the recipient
    expect(email.body.toLowerCase()).not.toContain("unreachable");
    expect(email.body.toLowerCase()).not.toContain("error");
  });

  it("handles a missing first name", () => {
    const email = generateFallbackEmail({ ...lead, firstName: "" }, "claude failed");
    expect(email.body.length).toBeGreaterThan(0);
    expect(email.body).not.toContain("undefined");
  });
});
