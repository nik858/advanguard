import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, SESSION_CONFIG } from "@/lib/auth";

export async function GET(req: Request) {
  const c = await cookies();
  const token = c.get(SESSION_CONFIG.cookieName)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const sha = url.searchParams.get("sha");
  if (!sha) return NextResponse.json({ error: "sha required" }, { status: 400 });

  const projectId = process.env.VERCEL_PROJECT_ID;
  const apiToken = process.env.VERCEL_DEPLOY_TOKEN;
  if (!projectId || !apiToken) {
    return NextResponse.json({ state: "UNKNOWN", reason: "Vercel API not configured" });
  }

  const r = await fetch(`https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=5`, {
    headers: { Authorization: `Bearer ${apiToken}` },
    cache: "no-store",
  });
  if (!r.ok) return NextResponse.json({ state: "UNKNOWN" });
  const body = await r.json();
  const match = (body.deployments as any[]).find((d) => d.meta?.githubCommitSha === sha);
  if (!match) return NextResponse.json({ state: "PENDING" });
  return NextResponse.json({ state: match.state, url: match.url });
}
