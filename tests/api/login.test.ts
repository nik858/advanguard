// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";
import { POST as login } from "@/app/api/login/route";
import { hashPassword } from "@/lib/auth";

beforeAll(async () => {
  process.env.JWT_SECRET = "test-secret-at-least-32-chars-long-xxxxxxxxx";
  process.env.ADMIN_PASSWORD_HASH = await hashPassword("correct");
});

function mkReq(body: unknown): Request {
  return new Request("http://localhost/api/login", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "127.0.0.1" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/login", () => {
  it("accepts correct password and sets cookie", async () => {
    const res = await login(mkReq({ password: "correct" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie") || "").toMatch(/__adv_session=/);
  });

  it("rejects wrong password", async () => {
    const res = await login(mkReq({ password: "nope" }));
    expect(res.status).toBe(401);
  });

  it("rejects missing password", async () => {
    const res = await login(mkReq({}));
    expect(res.status).toBe(400);
  });
});
