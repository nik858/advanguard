import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, SESSION_CONFIG } from "@/lib/auth";
import { getCommitState } from "@/lib/github";

/**
 * Vercel's own API needs VERCEL_DEPLOY_TOKEN, which production does not
 * always have — without it the editor used to sit on "Building…" until it
 * timed out, even though the deploy had finished. GitHub's commit status
 * carries the same signal and only needs GITHUB_TOKEN, which publishing
 * already requires.
 */
async function stateFromGitHub(sha: string): Promise<NextResponse> {
  try {
    const state = await getCommitState(sha);
    if (state === "success") return NextResponse.json({ state: "READY", via: "github" });
    if (state === "failure") return NextResponse.json({ state: "ERROR", via: "github" });
    return NextResponse.json({ state: "PENDING", via: "github" });
  } catch (e) {
    console.warn("[deploy-status] github fallback failed", { error: String(e) });
    return NextResponse.json({ state: "UNKNOWN" });
  }
}

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
  if (!projectId || !apiToken) return stateFromGitHub(sha);

  const r = await fetch(`https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=5`, {
    headers: { Authorization: `Bearer ${apiToken}` },
    cache: "no-store",
  });
  if (!r.ok) return stateFromGitHub(sha);
  const body = await r.json();
  const match = (body.deployments as { state?: string; url?: string; meta?: { githubCommitSha?: string } }[])
    .find((d) => d.meta?.githubCommitSha === sha);
  // A newer commit can supersede this one before Vercel lists a deployment
  // for it; GitHub still reports the status, so ask it rather than spin.
  if (!match) return stateFromGitHub(sha);
  return NextResponse.json({ state: match.state, url: match.url });
}
