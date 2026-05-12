import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyPassword, signSession, SESSION_CONFIG } from "@/lib/auth";
import { checkLimit, clientIp, loginLimiter } from "@/lib/ratelimit";

const BodySchema = z.object({ password: z.string().min(1) });

export async function POST(req: Request) {
  const ip = clientIp(req);
  const limit = await checkLimit(loginLimiter, ip);
  if (!limit.success) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Missing password" }, { status: 400 });

  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

  const ok = await verifyPassword(parsed.data.password, hash);
  if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const token = await signSession({ sub: "nik" });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_CONFIG.cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_CONFIG.maxAgeSeconds,
  });
  return res;
}
