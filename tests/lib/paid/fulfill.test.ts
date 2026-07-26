// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import type Stripe from "stripe";

const runAudit = vi.fn().mockResolvedValue(undefined);
const addContactToSegment = vi.fn().mockResolvedValue(undefined);
const insertPaidLeadOnce = vi.fn();

beforeEach(() => {
  vi.restoreAllMocks();
  runAudit.mockClear();
  addContactToSegment.mockClear();
  addContactToSegment.mockResolvedValue(undefined);
  insertPaidLeadOnce.mockReset();
  insertPaidLeadOnce.mockResolvedValue({ id: "00000000-0000-0000-0000-000000000002" });
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/audit/index", () => ({ runAudit }));
vi.mock("@/lib/email", () => ({ addContactToSegment }));
vi.mock("@/lib/db/leads", () => ({ insertPaidLeadOnce: (...a: unknown[]) => insertPaidLeadOnce(...a) }));

function mkSession(overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session {
  return {
    id: "cs_test_123",
    payment_status: "paid",
    metadata: {
      lead_email: "matt@clinicabc.com",
      clinic_type: "dental_implant",
      clinic_url: "https://www.clinicabc.com/",
    },
    customer_details: { email: "matt@clinicabc.com" },
    customer_email: null,
    ...overrides,
  } as Stripe.Checkout.Session;
}

describe("fulfillPaidCheckout", () => {
  it("inserts the paid lead and runs the audit against the typed clinic URL", async () => {
    const { fulfillPaidCheckout } = await import("@/lib/paid/fulfill");
    const result = await fulfillPaidCheckout(mkSession());
    expect(result).toBe("fulfilled");
    expect(insertPaidLeadOnce).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        email: "matt@clinicabc.com",
        source: "paid",
        clinicType: "dental_implant",
        clinicUrl: "https://www.clinicabc.com/",
        stripeSessionId: "cs_test_123",
        domain: "clinicabc.com", // clinic URL host, www stripped
      }),
    );
    expect(runAudit).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        id: "00000000-0000-0000-0000-000000000002",
        email: "matt@clinicabc.com",
        domain: "clinicabc.com",
        websiteUrl: "https://www.clinicabc.com/",
      }),
    );
  });

  it("audits the typed URL even when the buyer pays with a personal email", async () => {
    const { fulfillPaidCheckout } = await import("@/lib/paid/fulfill");
    const session = mkSession({
      metadata: { lead_email: "matt@gmail.com", clinic_type: "med_spa", clinic_url: "https://myclinic.si" },
      customer_details: { email: "matt@gmail.com" } as Stripe.Checkout.Session["customer_details"],
    });
    await fulfillPaidCheckout(session);
    expect(runAudit).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ domain: "myclinic.si", websiteUrl: "https://myclinic.si/" }),
    );
  });

  it("is idempotent: skips the audit when the session was already fulfilled", async () => {
    insertPaidLeadOnce.mockResolvedValue(null);
    const { fulfillPaidCheckout } = await import("@/lib/paid/fulfill");
    const result = await fulfillPaidCheckout(mkSession());
    expect(result).toBe("already_fulfilled");
    expect(runAudit).not.toHaveBeenCalled();
    expect(addContactToSegment).not.toHaveBeenCalled();
  });

  it("does nothing for an unpaid session", async () => {
    const { fulfillPaidCheckout } = await import("@/lib/paid/fulfill");
    const result = await fulfillPaidCheckout(mkSession({ payment_status: "unpaid" }));
    expect(result).toBe("skipped");
    expect(insertPaidLeadOnce).not.toHaveBeenCalled();
    expect(runAudit).not.toHaveBeenCalled();
  });

  it("skips when the session carries no email at all", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { fulfillPaidCheckout } = await import("@/lib/paid/fulfill");
    const result = await fulfillPaidCheckout(
      mkSession({ metadata: { clinic_url: "https://x.com" }, customer_details: null, customer_email: null }),
    );
    expect(result).toBe("skipped");
    expect(consoleError).toHaveBeenCalled();
  });

  it("keeps internal/test email domains out of the contact list but still audits", async () => {
    const { fulfillPaidCheckout } = await import("@/lib/paid/fulfill");
    const session = mkSession({
      metadata: { lead_email: "nik@advanguard.agency", clinic_type: "other", clinic_url: "https://someclinic.com" },
      customer_details: { email: "nik@advanguard.agency" } as Stripe.Checkout.Session["customer_details"],
    });
    await fulfillPaidCheckout(session);
    expect(addContactToSegment).not.toHaveBeenCalled();
    expect(runAudit).toHaveBeenCalledOnce();
  });

  it("still runs the audit when the contact-list sync fails", async () => {
    addContactToSegment.mockRejectedValueOnce(new Error("Resend 500"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { fulfillPaidCheckout } = await import("@/lib/paid/fulfill");
    const result = await fulfillPaidCheckout(mkSession());
    expect(result).toBe("fulfilled");
    expect(runAudit).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalled();
  });

  it("never throws when the insert fails", async () => {
    insertPaidLeadOnce.mockRejectedValueOnce(new Error("db down"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { fulfillPaidCheckout } = await import("@/lib/paid/fulfill");
    const result = await fulfillPaidCheckout(mkSession());
    expect(result).toBe("skipped");
    expect(runAudit).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalled();
  });
});
