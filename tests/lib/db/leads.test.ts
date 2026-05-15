// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// Build a chainable mock of the Drizzle query builder.
// Each method returns the mock itself so calls can chain.
const chain = {
  insert: vi.fn(),
  values: vi.fn(),
  returning: vi.fn(),
  update: vi.fn(),
  set: vi.fn(),
  where: vi.fn(),
  select: vi.fn(),
  from: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  offset: vi.fn(),
  delete: vi.fn(),
  execute: vi.fn(),
} as const;

function resetChain() {
  for (const k of Object.keys(chain) as (keyof typeof chain)[]) {
    chain[k].mockReset();
    chain[k].mockReturnValue(chain);
  }
}

vi.mock("@/lib/db/client", () => ({
  getDb: () => chain,
}));

const fakeRow = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "matt@brightsmile.com",
  firstName: "Matt",
  phone: null,
  domain: "brightsmile.com",
  source: "inbound",
  status: "new",
  auditSubject: null,
  auditBody: null,
  auditOutcome: null,
  auditReason: null,
  signals: null,
  createdAt: new Date("2026-05-14T12:00:00Z"),
  updatedAt: new Date("2026-05-14T12:00:00Z"),
};

import {
  insertLead,
  updateLeadAudit,
  listLeads,
  getLead,
  updateLeadStatus,
  updateLeadFields,
  deleteLead,
  exportLeadsForCsv,
} from "@/lib/db/leads";

describe("lib/db/leads", () => {
  beforeEach(() => resetChain());

  describe("insertLead", () => {
    it("inserts and returns the row", async () => {
      chain.returning.mockResolvedValueOnce([fakeRow]);
      const result = await insertLead({
        email: "matt@brightsmile.com",
        firstName: "Matt",
        domain: "brightsmile.com",
        source: "inbound",
      });
      expect(chain.insert).toHaveBeenCalledTimes(1);
      expect(chain.values).toHaveBeenCalledWith({
        email: "matt@brightsmile.com",
        firstName: "Matt",
        domain: "brightsmile.com",
        source: "inbound",
      });
      expect(chain.returning).toHaveBeenCalledTimes(1);
      expect(result).toEqual(fakeRow);
    });
  });

  describe("updateLeadAudit", () => {
    it("updates audit_* columns + updatedAt for the given id", async () => {
      chain.where.mockResolvedValueOnce(undefined);
      await updateLeadAudit({
        id: fakeRow.id,
        subject: "Hi Matt",
        body: "Your site...",
        outcome: "success",
        reason: null,
        signals: { url: "https://x" },
      });
      expect(chain.update).toHaveBeenCalledTimes(1);
      expect(chain.set).toHaveBeenCalledTimes(1);
      const setArg = chain.set.mock.calls[0][0];
      expect(setArg.auditSubject).toBe("Hi Matt");
      expect(setArg.auditBody).toBe("Your site...");
      expect(setArg.auditOutcome).toBe("success");
      expect(setArg.auditReason).toBeNull();
      expect(setArg.signals).toEqual({ url: "https://x" });
      expect(setArg.updatedAt).toBeInstanceOf(Date);
      expect(chain.where).toHaveBeenCalledTimes(1);
    });
  });

  describe("listLeads", () => {
    it("orders by created_at desc and applies a limit", async () => {
      chain.offset.mockResolvedValueOnce([fakeRow]);
      const result = await listLeads({ limit: 50, offset: 0 });
      expect(chain.select).toHaveBeenCalledTimes(1);
      expect(chain.from).toHaveBeenCalledTimes(1);
      expect(chain.orderBy).toHaveBeenCalledTimes(1);
      expect(chain.limit).toHaveBeenCalledWith(50);
      expect(chain.offset).toHaveBeenCalledWith(0);
      expect(result).toEqual([fakeRow]);
    });

    it("caps the limit at 200", async () => {
      chain.offset.mockResolvedValueOnce([]);
      await listLeads({ limit: 9999, offset: 0 });
      expect(chain.limit).toHaveBeenCalledWith(200);
    });
  });

  describe("getLead", () => {
    it("returns the row or null", async () => {
      chain.limit.mockResolvedValueOnce([fakeRow]);
      const result = await getLead(fakeRow.id);
      expect(result).toEqual(fakeRow);
    });

    it("returns null when no row matches", async () => {
      chain.limit.mockResolvedValueOnce([]);
      const result = await getLead("00000000-0000-0000-0000-000000000099");
      expect(result).toBeNull();
    });
  });

  describe("updateLeadStatus", () => {
    it("sets status + updatedAt for the row", async () => {
      chain.where.mockResolvedValueOnce(undefined);
      await updateLeadStatus({ id: fakeRow.id, status: "contacted" });
      const setArg = chain.set.mock.calls[0][0];
      expect(setArg.status).toBe("contacted");
      expect(setArg.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe("updateLeadFields", () => {
    it("updates only the provided fields and bumps updatedAt", async () => {
      chain.where.mockResolvedValueOnce(undefined);
      await updateLeadFields({ id: fakeRow.id, firstName: "Mathieu", phone: "+33..." });
      const setArg = chain.set.mock.calls[0][0];
      expect(setArg.firstName).toBe("Mathieu");
      expect(setArg.phone).toBe("+33...");
      expect(setArg.updatedAt).toBeInstanceOf(Date);
      expect("status" in setArg).toBe(false);
    });
  });

  describe("deleteLead", () => {
    it("deletes the row by id", async () => {
      chain.where.mockResolvedValueOnce(undefined);
      await deleteLead(fakeRow.id);
      expect(chain.delete).toHaveBeenCalledTimes(1);
      expect(chain.where).toHaveBeenCalledTimes(1);
    });
  });

  describe("exportLeadsForCsv", () => {
    it("selects all rows ordered by created_at desc with no limit", async () => {
      chain.orderBy.mockResolvedValueOnce([fakeRow, fakeRow]);
      const result = await exportLeadsForCsv();
      expect(chain.select).toHaveBeenCalledTimes(1);
      expect(chain.orderBy).toHaveBeenCalledTimes(1);
      expect(chain.limit).not.toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });
  });
});
