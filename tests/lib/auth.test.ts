// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";
import { hashPassword, verifyPassword, signSession, verifySession } from "@/lib/auth";

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-at-least-32-chars-long-xxxxxxxxx";
});

describe("password", () => {
  it("hash and verify round-trip", async () => {
    const hash = await hashPassword("hunter2");
    expect(await verifyPassword("hunter2", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});

describe("session JWT", () => {
  it("sign and verify round-trip", async () => {
    const token = await signSession({ sub: "nik" });
    const payload = await verifySession(token);
    expect(payload?.sub).toBe("nik");
  });

  it("rejects tampered tokens", async () => {
    const token = await signSession({ sub: "nik" });
    const tampered = token.slice(0, -3) + "AAA";
    expect(await verifySession(tampered)).toBeNull();
  });

  it("returns null for malformed tokens", async () => {
    expect(await verifySession("not-a-jwt")).toBeNull();
    expect(await verifySession("")).toBeNull();
  });
});
