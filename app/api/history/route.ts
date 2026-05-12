import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, SESSION_CONFIG } from "@/lib/auth";
import { listRecentCommits } from "@/lib/github";

export async function GET() {
  const c = await cookies();
  const token = c.get(SESSION_CONFIG.cookieName)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const commits = await listRecentCommits("content/content.json", 30);
    return NextResponse.json({ commits });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
