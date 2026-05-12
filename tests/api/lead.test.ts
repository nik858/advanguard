// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  process.env.GHL_LEAD_WEBHOOK_URL = "https://x.test/hook";
});

function mkReq(body: unknown): Request {
  return new Request("http://localhost/api/lead", {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "test/1.0", "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/lead", () => {
  it("forwards valid lead to GHL", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 200 }));
    const { POST } = await import("@/app/api/lead/route");
    const res = await POST(mkReq({ email: "matt@clinicabc.com", phone: "+1234" }));
    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalled();
  });

  it("rejects gmail/yahoo emails", async () => {
    const { POST } = await import("@/app/api/lead/route");
    const res = await POST(mkReq({ email: "matt@gmail.com" }));
    expect(res.status).toBe(400);
  });

  it("rejects missing email", async () => {
    const { POST } = await import("@/app/api/lead/route");
    const res = await POST(mkReq({ phone: "+1234" }));
    expect(res.status).toBe(400);
  });

  it("silently accepts honeypot fill (likely bot)", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 200 }));
    const { POST } = await import("@/app/api/lead/route");
    const res = await POST(mkReq({ email: "matt@clinicabc.com", website: "spam" }));
    expect(res.status).toBe(200);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
