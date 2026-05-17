// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";

const runAudit = vi.fn().mockResolvedValue(undefined);
const afterCb: Array<() => void> = [];

beforeEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  runAudit.mockClear();
  afterCb.length = 0;
});

vi.mock("next/server", async (orig) => {
  const actual = await orig<typeof import("next/server")>();
  return {
    ...actual,
    after: (cb: () => void) => { afterCb.push(cb); },
  };
});
vi.mock("@/lib/audit/index", () => ({ runAudit }));
vi.mock("@/lib/db/leads", () => ({
  insertLead: vi.fn().mockResolvedValue({ id: "00000000-0000-0000-0000-000000000001" }),
}));

function mkReq(body: unknown): Request {
  return new Request("http://localhost/api/lead", {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "test/1.0", "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/lead", () => {
  it("schedules runAudit for a valid work email", async () => {
    const { POST } = await import("@/app/api/lead/route");
    const res = await POST(mkReq({ email: "matt@clinicabc.com", first_name: "Matt" }));
    expect(res.status).toBe(200);
    expect(afterCb).toHaveLength(1);
    afterCb[0]();
    expect(runAudit).toHaveBeenCalledOnce();
    expect(runAudit.mock.calls[0][0]).toMatchObject({ email: "matt@clinicabc.com", firstName: "Matt", domain: "clinicabc.com" });
  });

  it("rejects generic email domains", async () => {
    const { POST } = await import("@/app/api/lead/route");
    const res = await POST(mkReq({ email: "matt@gmail.com" }));
    expect(res.status).toBe(400);
    expect(afterCb).toHaveLength(0);
  });

  it("rejects an invalid/missing email", async () => {
    const { POST } = await import("@/app/api/lead/route");
    const res = await POST(mkReq({ phone: "+1234" }));
    expect(res.status).toBe(400);
  });

  it("silently accepts a honeypot fill without scheduling an audit", async () => {
    const { POST } = await import("@/app/api/lead/route");
    const res = await POST(mkReq({ email: "matt@clinicabc.com", website: "spam" }));
    expect(res.status).toBe(200);
    expect(afterCb).toHaveLength(0);
  });

  it("persists a valid clinic_type", async () => {
    const insertLead = vi.fn().mockResolvedValue({ id: "00000000-0000-0000-0000-000000000001" });
    vi.doMock("@/lib/db/leads", () => ({ insertLead }));
    const { POST } = await import("@/app/api/lead/route");
    const res = await POST(mkReq({ email: "matt@clinicabc.com", clinic_type: "dental_implant" }));
    expect(res.status).toBe(200);
    expect(insertLead).toHaveBeenCalledWith(expect.objectContaining({ clinicType: "dental_implant" }));
  });

  it("treats a missing clinic_type as null", async () => {
    const insertLead = vi.fn().mockResolvedValue({ id: "00000000-0000-0000-0000-000000000001" });
    vi.doMock("@/lib/db/leads", () => ({ insertLead }));
    const { POST } = await import("@/app/api/lead/route");
    const res = await POST(mkReq({ email: "matt@clinicabc.com" }));
    expect(res.status).toBe(200);
    expect(insertLead).toHaveBeenCalledWith(expect.objectContaining({ clinicType: null }));
  });

  it("rejects an unknown clinic_type value", async () => {
    const { POST } = await import("@/app/api/lead/route");
    const res = await POST(mkReq({ email: "matt@clinicabc.com", clinic_type: "not_a_thing" }));
    expect(res.status).toBe(400);
  });
});
