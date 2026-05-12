import { NextResponse } from "next/server";
import { SESSION_CONFIG } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_CONFIG.cookieName, "", { path: "/", maxAge: 0 });
  return res;
}
