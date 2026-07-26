// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";

const sessionsCreate = vi.fn();

beforeEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  sessionsCreate.mockReset();
  sessionsCreate.mockResolvedValue({ id: "cs_test_123", client_secret: "cs_test_123_secret_abc" });
  vi.stubEnv("STRIPE_PRICE_ID", "price_test_27");
});

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({ checkout: { sessions: { create: sessionsCreate } } }),
}));

function mkReq(body: unknown): Request {
  return new Request("http://localhost/api/paid/checkout", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  email: "matt@clinicabc.com",
  clinic_type: "dental_implant",
  clinic_url: "https://www.clinicabc.com",
};

describe("POST /api/paid/checkout", () => {
  it("creates an embedded $27 Checkout session and returns its client secret", async () => {
    const { POST } = await import("@/app/api/paid/checkout/route");
    const res = await POST(mkReq(validBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.clientSecret).toBe("cs_test_123_secret_abc");
    expect(sessionsCreate).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        ui_mode: "embedded_page",
        mode: "payment",
        line_items: [{ price: "price_test_27", quantity: 1 }],
        customer_email: "matt@clinicabc.com",
        payment_intent_data: { receipt_email: "matt@clinicabc.com" },
        metadata: {
          lead_email: "matt@clinicabc.com",
          clinic_type: "dental_implant",
          clinic_url: "https://www.clinicabc.com/",
        },
        return_url: expect.stringContaining("/paid/thank-you?session_id="),
      }),
    );
  });

  it("normalizes a scheme-less clinic URL to https", async () => {
    const { POST } = await import("@/app/api/paid/checkout/route");
    const res = await POST(mkReq({ ...validBody, clinic_url: "clinicabc.com/fr" }));
    expect(res.status).toBe(200);
    expect(sessionsCreate.mock.calls[0][0].metadata.clinic_url).toBe("https://clinicabc.com/fr");
  });

  it("does NOT block personal email domains — the audit target is the typed URL", async () => {
    const { POST } = await import("@/app/api/paid/checkout/route");
    const res = await POST(mkReq({ ...validBody, email: "matt@gmail.com" }));
    expect(res.status).toBe(200);
  });

  it("rejects an invalid email", async () => {
    const { POST } = await import("@/app/api/paid/checkout/route");
    const res = await POST(mkReq({ ...validBody, email: "not-an-email" }));
    expect(res.status).toBe(400);
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it("rejects a missing clinic_type", async () => {
    const { POST } = await import("@/app/api/paid/checkout/route");
    const res = await POST(mkReq({ email: validBody.email, clinic_url: validBody.clinic_url }));
    expect(res.status).toBe(400);
  });

  it("rejects an unparseable clinic URL", async () => {
    const { POST } = await import("@/app/api/paid/checkout/route");
    const res = await POST(mkReq({ ...validBody, clinic_url: "not a url at all" }));
    expect(res.status).toBe(400);
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it("silently accepts a honeypot fill without creating a session", async () => {
    const { POST } = await import("@/app/api/paid/checkout/route");
    const res = await POST(mkReq({ ...validBody, website: "spam" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.clientSecret).toBeUndefined();
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it("returns 500 when Stripe rejects the session", async () => {
    sessionsCreate.mockRejectedValueOnce(new Error("stripe down"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { POST } = await import("@/app/api/paid/checkout/route");
    const res = await POST(mkReq(validBody));
    expect(res.status).toBe(500);
    expect(consoleError).toHaveBeenCalled();
  });

  it("returns 500 when STRIPE_PRICE_ID is missing", async () => {
    vi.stubEnv("STRIPE_PRICE_ID", "");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { POST } = await import("@/app/api/paid/checkout/route");
    const res = await POST(mkReq(validBody));
    expect(res.status).toBe(500);
    expect(sessionsCreate).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalled();
  });
});
