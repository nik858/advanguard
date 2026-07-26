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

describe("normalizeClinicUrl", () => {
  it("passes through a full https URL", async () => {
    const { normalizeClinicUrl } = await import("@/lib/audit/domain");
    expect(normalizeClinicUrl("https://www.clinicabc.com/fr")).toBe("https://www.clinicabc.com/fr");
  });
  it("prepends https:// to a bare domain", async () => {
    const { normalizeClinicUrl } = await import("@/lib/audit/domain");
    expect(normalizeClinicUrl("clinicabc.com")).toBe("https://clinicabc.com/");
  });
  it("keeps an explicit http scheme", async () => {
    const { normalizeClinicUrl } = await import("@/lib/audit/domain");
    expect(normalizeClinicUrl("http://clinicabc.com")).toBe("http://clinicabc.com/");
  });
  it("trims surrounding whitespace", async () => {
    const { normalizeClinicUrl } = await import("@/lib/audit/domain");
    expect(normalizeClinicUrl("  clinicabc.com  ")).toBe("https://clinicabc.com/");
  });
  it("rejects empty input", async () => {
    const { normalizeClinicUrl } = await import("@/lib/audit/domain");
    expect(normalizeClinicUrl("   ")).toBeNull();
  });
  it("rejects a hostname without a dot", async () => {
    const { normalizeClinicUrl } = await import("@/lib/audit/domain");
    expect(normalizeClinicUrl("localhost")).toBeNull();
    expect(normalizeClinicUrl("justaword")).toBeNull();
  });
  it("rejects free text with spaces", async () => {
    const { normalizeClinicUrl } = await import("@/lib/audit/domain");
    expect(normalizeClinicUrl("not a url at all")).toBeNull();
  });
});

describe("resolveProvidedUrl", () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it("returns the final URL when the typed site answers", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response("", { status: 200, headers: { "content-type": "text/html" } }),
    );
    const { resolveProvidedUrl } = await import("@/lib/audit/domain");
    expect(await resolveProvidedUrl("clinicabc.com")).toBe("https://clinicabc.com/");
  });

  it("falls back to the www variant when the apex is unreachable", async () => {
    const fetchMock = vi.spyOn(global, "fetch")
      .mockRejectedValueOnce(new Error("ECONNREFUSED"))
      .mockResolvedValueOnce(new Response("", { status: 200 }));
    const { resolveProvidedUrl } = await import("@/lib/audit/domain");
    expect(await resolveProvidedUrl("https://clinicabc.com")).toBe("https://www.clinicabc.com/");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns null when nothing answers", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));
    const { resolveProvidedUrl } = await import("@/lib/audit/domain");
    expect(await resolveProvidedUrl("clinicabc.com")).toBeNull();
  });

  it("returns null for garbage input without fetching", async () => {
    const fetchMock = vi.spyOn(global, "fetch");
    const { resolveProvidedUrl } = await import("@/lib/audit/domain");
    expect(await resolveProvidedUrl("not a url")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
