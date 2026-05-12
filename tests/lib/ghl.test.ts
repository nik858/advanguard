// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  process.env.GHL_LEAD_WEBHOOK_URL = "https://services.leadconnectorhq.com/hooks/test";
});

describe("postLeadToGHL", () => {
  it("POSTs JSON to webhook URL", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 200 }));
    const { postLeadToGHL } = await import("@/lib/ghl");
    await postLeadToGHL({ email: "a@b.com", domain: "b.com" });
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://services.leadconnectorhq.com/hooks/test",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("retries on 5xx", async () => {
    const fetchSpy = vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 502 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    const { postLeadToGHL } = await import("@/lib/ghl");
    await postLeadToGHL({ email: "a@b.com" });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("throws if no webhook URL configured", async () => {
    delete process.env.GHL_LEAD_WEBHOOK_URL;
    vi.resetModules();
    const { postLeadToGHL } = await import("@/lib/ghl");
    await expect(postLeadToGHL({ email: "a@b.com" })).rejects.toThrow();
  });
});
