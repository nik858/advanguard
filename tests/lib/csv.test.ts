import { describe, it, expect } from "vitest";
import { leadsToCsv, csvCell } from "@/lib/csv";
import type { Lead } from "@/lib/db/schema";

const row: Lead = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "matt@brightsmile.com",
  firstName: "Matt",
  phone: null,
  domain: "brightsmile.com",
  source: "inbound",
  status: "new",
  auditSubject: "Hi Matt",
  auditBody: "Your site has...",
  auditOutcome: "success",
  auditReason: null,
  signals: { url: "https://brightsmile.com" },
  createdAt: new Date("2026-05-14T12:00:00.000Z"),
  updatedAt: new Date("2026-05-14T12:00:00.000Z"),
};

describe("csvCell", () => {
  it("wraps every value in double quotes", () => {
    expect(csvCell("hello")).toBe('"hello"');
  });

  it("escapes embedded double quotes by doubling them", () => {
    expect(csvCell('Tom "Jerry"')).toBe('"Tom ""Jerry"""');
  });

  it("strips newlines so Excel never breaks a row", () => {
    expect(csvCell("line 1\nline 2")).toBe('"line 1 line 2"');
    expect(csvCell("line 1\r\nline 2")).toBe('"line 1 line 2"');
  });

  it("renders null/undefined as an empty quoted cell", () => {
    expect(csvCell(null)).toBe('""');
    expect(csvCell(undefined)).toBe('""');
  });

  it("renders Date as an ISO string", () => {
    expect(csvCell(new Date("2026-05-14T12:00:00.000Z"))).toBe('"2026-05-14T12:00:00.000Z"');
  });
});

describe("leadsToCsv", () => {
  it("starts with a UTF-8 BOM", () => {
    const csv = leadsToCsv([]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("emits only the header row for an empty input", () => {
    const csv = leadsToCsv([]);
    const lines = csv.slice(1).split("\n").filter(Boolean);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/^"id","email","first_name","phone","domain","source","status","audit_outcome","created_at","updated_at"$/);
  });

  it("emits the expected columns and skips audit_subject / audit_body / signals", () => {
    const csv = leadsToCsv([row]);
    const lines = csv.slice(1).split("\n").filter(Boolean);
    expect(lines).toHaveLength(2);
    const header = lines[0];
    expect(header).not.toContain("audit_subject");
    expect(header).not.toContain("audit_body");
    expect(header).not.toContain("signals");
    const data = lines[1];
    expect(data).toContain('"matt@brightsmile.com"');
    expect(data).toContain('"Matt"');
    expect(data).toContain('"inbound"');
    expect(data).toContain('"new"');
    expect(data).toContain('"success"');
  });
});
