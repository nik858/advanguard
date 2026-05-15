import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mockSend };
    constructor(_apiKey: string) {}
  },
}));

// Import AFTER the mock so the SDK is already stubbed.
import { sendAuditEmail, bodyToHtml, RESEND_FROM } from "@/lib/email";

describe("lib/email — bodyToHtml", () => {
  it("converts paragraphs + line breaks to semantic HTML", () => {
    expect(bodyToHtml("Line 1\nLine 2\n\nParagraph 2")).toBe(
      "<p>Line 1<br>Line 2</p><p>Paragraph 2</p>"
    );
  });

  it("escapes HTML in the body", () => {
    const html = bodyToHtml("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toMatch(/<script[^>]*>/i);
  });

  it("escapes ampersands and quotes", () => {
    expect(bodyToHtml('Tom & "Jerry"')).toBe('<p>Tom &amp; &quot;Jerry&quot;</p>');
  });
});

describe("lib/email — sendAuditEmail", () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = "test_key";
    mockSend.mockReset();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends with the expected payload", async () => {
    mockSend.mockResolvedValueOnce({ data: { id: "x" }, error: null });

    await sendAuditEmail({ to: "a@b.com", subject: "Sub", body: "Hello" });

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith({
      from: RESEND_FROM,
      to: "a@b.com",
      subject: "Sub",
      text: "Hello",
      html: "<p>Hello</p>",
    });
  });

  it("throws if RESEND_API_KEY is unset and never calls the SDK", async () => {
    delete process.env.RESEND_API_KEY;
    await expect(
      sendAuditEmail({ to: "a@b.com", subject: "x", body: "x" })
    ).rejects.toThrow(/RESEND_API_KEY/);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("does not retry on 4xx", async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: { statusCode: 422, name: "validation_error", message: "Bad" },
    });

    await expect(
      sendAuditEmail({ to: "a@b.com", subject: "x", body: "x" })
    ).rejects.toThrow(/422/);

    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("retries on 5xx and eventually throws after 3 attempts", async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: { statusCode: 500, name: "internal", message: "Boom" },
    });

    const p = sendAuditEmail({ to: "a@b.com", subject: "x", body: "x" });
    // Attach a no-op catch immediately so the rejection isn't briefly unhandled
    // while we advance timers (fake-timers + async rejection timing quirk).
    p.catch(() => {});

    // First attempt fires immediately, then 1s backoff, then 3s backoff.
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(3000);

    await expect(p).rejects.toThrow(/500/);
    expect(mockSend).toHaveBeenCalledTimes(3);
  });

  it("retries when the SDK throws a network error", async () => {
    mockSend
      .mockRejectedValueOnce(new Error("ENOTFOUND api.resend.com"))
      .mockResolvedValueOnce({ data: { id: "ok" }, error: null });

    const p = sendAuditEmail({ to: "a@b.com", subject: "x", body: "x" });
    p.catch(() => {});
    await vi.advanceTimersByTimeAsync(1000);

    await expect(p).resolves.toBeUndefined();
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it("recovers when a 5xx is followed by a success", async () => {
    mockSend
      .mockResolvedValueOnce({
        data: null,
        error: { statusCode: 500, name: "internal", message: "Boom" },
      })
      .mockResolvedValueOnce({
        data: null,
        error: { statusCode: 502, name: "bad_gateway", message: "Boom" },
      })
      .mockResolvedValueOnce({ data: { id: "ok" }, error: null });

    const p = sendAuditEmail({ to: "a@b.com", subject: "x", body: "x" });
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(3000);

    await expect(p).resolves.toBeUndefined();
    expect(mockSend).toHaveBeenCalledTimes(3);
  });
});
