import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, SESSION_CONFIG } from "@/lib/auth";
import { ContentSchema } from "@/types/content";
import { Octokit } from "@octokit/rest";
import { saveDraft } from "@/lib/blob";

export async function POST(req: Request) {
  const c = await cookies();
  const token = c.get(SESSION_CONFIG.cookieName)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const sha = body?.sha;
  if (!sha || typeof sha !== "string") {
    return NextResponse.json({ error: "sha required" }, { status: 400 });
  }

  // Read content.json at this commit via the GitHub API
  const ghToken = process.env.GITHUB_TOKEN;
  const slug = process.env.GITHUB_REPO;
  if (!ghToken || !slug?.includes("/")) {
    return NextResponse.json({ error: "GitHub not configured" }, { status: 502 });
  }
  const [owner, repo] = slug.split("/");
  const octo = new Octokit({ auth: ghToken });

  try {
    const res = await octo.rest.repos.getContent({ owner, repo, path: "content/content.json", ref: sha });
    if (Array.isArray(res.data) || res.data.type !== "file") throw new Error("Not a file");
    const text = Buffer.from(res.data.content, "base64").toString("utf-8");
    const parsed = ContentSchema.safeParse(JSON.parse(text));
    if (!parsed.success) {
      return NextResponse.json({ error: "Le contenu de cette version est invalide", issues: parsed.error.issues }, { status: 422 });
    }
    await saveDraft(parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
