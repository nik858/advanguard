// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  process.env.GHL_AUDIT_WEBHOOK_URL = "https://services.leadconnectorhq.com/hooks/test";
});

const payload = {
  email: "matt@brightsmile.com",
  first_name: "Matt",
  ai_email_subject: "Matt, a quick look at brightsmile.com",
  ai_email_body: "Hi Matt,\n\nI took a look...",
};

describe("postAuditToGHL", () => {
  it("POSTs the payload to the audit webhook URL", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 200 }));
    const { postAuditToGHL } = await import("@/lib/ghl");
    await postAuditToGHL(payload);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://services.leadconnectorhq.com/hooks/test",
      expect.objectContaining({ method: "POST" }),
    );
    const sentBody = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    expect(sentBody).toEqual(payload);
  });

  it("retries on 5xx", async () => {
    const fetchSpy = vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 502 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    const { postAuditToGHL } = await import("@/lib/ghl");
    await postAuditToGHL(payload);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("does not retry on a 4xx response — fails fast", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(new Response("bad request", { status: 400 }));
    const { postAuditToGHL } = await import("@/lib/ghl");
    await expect(postAuditToGHL(payload)).rejects.toThrow();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("throws when the webhook URL is not configured", async () => {
    delete process.env.GHL_AUDIT_WEBHOOK_URL;
    vi.resetModules();
    const { postAuditToGHL } = await import("@/lib/ghl");
    await expect(postAuditToGHL(payload)).rejects.toThrow();
  });
});
