// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractDomain, candidateUrls } from "@/lib/audit/domain";

describe("extractDomain", () => {
  it("extracts and lowercases the domain", () => {
    expect(extractDomain("Matt@ClinicABC.com")).toBe("clinicabc.com");
  });
  it("handles subdomains", () => {
    expect(extractDomain("info@mail.clinic.co.uk")).toBe("mail.clinic.co.uk");
  });
});

describe("candidateUrls", () => {
  it("produces https apex + www candidates", () => {
    expect(candidateUrls("clinicabc.com")).toEqual([
      "https://clinicabc.com",
      "https://www.clinicabc.com",
    ]);
  });
});

describe("resolveReachableUrl", () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it("returns the first reachable candidate's final URL", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response("", { status: 200, headers: { "content-type": "text/html" } }),
    );
    const { resolveReachableUrl } = await import("@/lib/audit/domain");
    const url = await resolveReachableUrl("clinicabc.com");
    expect(url).toBe("https://clinicabc.com/");
  });

  it("returns null when no candidate is reachable", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("ENOTFOUND"));
    const { resolveReachableUrl } = await import("@/lib/audit/domain");
    const url = await resolveReachableUrl("does-not-exist-xyz.com");
    expect(url).toBeNull();
  });
});
