// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock helpers used by all routes — toggle session validity per test.
let sessionValid = true;
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (_name: string) => (sessionValid ? { value: "fake-token" } : undefined),
  }),
}));
vi.mock("@/lib/auth", () => ({
  verifySession: async (t: string) => (t === "fake-token" ? { sub: "nik" } : null),
  SESSION_CONFIG: { cookieName: "__adv_session" },
}));

const fakeRow = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "matt@brightsmile.com",
  firstName: "Matt",
  phone: null,
  domain: "brightsmile.com",
  source: "manual" as const,
  status: "new" as const,
  auditSubject: null,
  auditBody: null,
  auditOutcome: null,
  auditReason: null,
  signals: null,
  clinicType: null,
  createdAt: new Date("2026-05-14T12:00:00Z"),
  updatedAt: new Date("2026-05-14T12:00:00Z"),
};

function makeReq(url: string, init?: RequestInit) {
  return new Request(url, init);
}

describe("/api/admin/leads", () => {
  beforeEach(() => {
    sessionValid = true;
    vi.resetModules();
  });

  it("GET returns 401 without a valid admin session", async () => {
    sessionValid = false;
    vi.doMock("@/lib/db/leads", () => ({ listLeads: vi.fn() }));
    const { GET } = await import("@/app/api/admin/leads/route");
    const res = await GET(makeReq("http://x/api/admin/leads"));
    expect(res.status).toBe(401);
  });

  it("GET returns rows when authed", async () => {
    vi.doMock("@/lib/db/leads", () => ({ listLeads: vi.fn().mockResolvedValue([fakeRow]) }));
    const { GET } = await import("@/app/api/admin/leads/route");
    const res = await GET(makeReq("http://x/api/admin/leads"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.rows).toHaveLength(1);
  });

  it("POST returns 400 on invalid email", async () => {
    vi.doMock("@/lib/db/leads", () => ({ insertLead: vi.fn() }));
    const { POST } = await import("@/app/api/admin/leads/route");
    const res = await POST(makeReq("http://x/api/admin/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "not-an-email" }),
    }));
    expect(res.status).toBe(400);
  });

  it("POST creates a manual lead", async () => {
    const insertLead = vi.fn().mockResolvedValue(fakeRow);
    vi.doMock("@/lib/db/leads", () => ({ insertLead }));
    const { POST } = await import("@/app/api/admin/leads/route");
    const res = await POST(makeReq("http://x/api/admin/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "matt@brightsmile.com", first_name: "Matt" }),
    }));
    expect(res.status).toBe(201);
    expect(insertLead).toHaveBeenCalledWith(expect.objectContaining({
      email: "matt@brightsmile.com",
      firstName: "Matt",
      source: "manual",
    }));
  });

  it("POST persists a valid clinic_type on a manual lead", async () => {
    const insertLead = vi.fn().mockResolvedValue(fakeRow);
    vi.doMock("@/lib/db/leads", () => ({ insertLead }));
    const { POST } = await import("@/app/api/admin/leads/route");
    const res = await POST(makeReq("http://x/api/admin/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "matt@brightsmile.com", clinic_type: "med_spa" }),
    }));
    expect(res.status).toBe(201);
    expect(insertLead).toHaveBeenCalledWith(expect.objectContaining({ clinicType: "med_spa" }));
  });

  it("POST stores null when clinic_type is omitted", async () => {
    const insertLead = vi.fn().mockResolvedValue(fakeRow);
    vi.doMock("@/lib/db/leads", () => ({ insertLead }));
    const { POST } = await import("@/app/api/admin/leads/route");
    const res = await POST(makeReq("http://x/api/admin/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "matt@brightsmile.com" }),
    }));
    expect(res.status).toBe(201);
    expect(insertLead).toHaveBeenCalledWith(expect.objectContaining({ clinicType: null }));
  });

  it("POST rejects an unknown clinic_type", async () => {
    vi.doMock("@/lib/db/leads", () => ({ insertLead: vi.fn() }));
    const { POST } = await import("@/app/api/admin/leads/route");
    const res = await POST(makeReq("http://x/api/admin/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "matt@brightsmile.com", clinic_type: "garbage" }),
    }));
    expect(res.status).toBe(400);
  });
});

describe("/api/admin/leads/[id]", () => {
  beforeEach(() => {
    sessionValid = true;
    vi.resetModules();
  });

  it("PATCH rejects invalid status", async () => {
    vi.doMock("@/lib/db/leads", () => ({
      updateLeadStatus: vi.fn(),
      updateLeadFields: vi.fn(),
      getLead: vi.fn().mockResolvedValue(fakeRow),
    }));
    const { PATCH } = await import("@/app/api/admin/leads/[id]/route");
    const res = await PATCH(
      makeReq("http://x/api/admin/leads/" + fakeRow.id, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "garbage" }),
      }),
      { params: Promise.resolve({ id: fakeRow.id }) },
    );
    expect(res.status).toBe(400);
  });
});

describe("/api/admin/leads/export", () => {
  beforeEach(() => {
    sessionValid = true;
    vi.resetModules();
  });

  it("returns text/csv with the right disposition", async () => {
    vi.doMock("@/lib/db/leads", () => ({ exportLeadsForCsv: vi.fn().mockResolvedValue([]) }));
    const { GET } = await import("@/app/api/admin/leads/export/route");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/csv/);
    expect(res.headers.get("content-disposition")).toMatch(/attachment; filename="leads-\d{4}-\d{2}-\d{2}\.csv"/);
  });
});
