import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, SESSION_CONFIG } from "@/lib/auth";
import { PromptsV2Schema, type PromptsV2 } from "@/types/prompts";
import { loadPrompts } from "@/lib/audit/prompts";
import { savePrompts, deletePrompts } from "@/lib/blob";
import { getFile, putFile } from "@/lib/github";
import bundledDefault from "@/content/prompts.json";

async function requireSession() {
  const c = await cookies();
  const token = c.get(SESSION_CONFIG.cookieName)?.value;
  return token ? await verifySession(token) : null;
}

/**
 * Persists `prompts` as a real commit on the configured GitHub branch so the
 * full edit history is browsable (and recoverable) via `git log` /
 * `git checkout`. Mirrors the safety net the landing page already has via
 * /api/publish. Failure to commit is non-fatal — the Blob is authoritative
 * for the runtime, the git copy is the safety net.
 */
async function commitPromptsToGit(prompts: PromptsV2, user: string): Promise<{ committed: boolean; commitSha?: string; reason?: string }> {
  try {
    const current = await getFile("content/prompts.json");
    const currentJson = JSON.stringify(current.content);
    const nextJson = JSON.stringify(prompts);
    if (currentJson === nextJson) return { committed: false, reason: "noop" };
    const r = await putFile({
      path: "content/prompts.json",
      content: prompts,
      sha: current.sha,
      message: `prompts: ${user} edit (${new Date().toISOString().slice(0,10)})`,
    });
    return { committed: true, commitSha: r.commitSha };
  } catch (e) {
    console.warn("[prompts] git commit skipped:", (e as Error).message);
    return { committed: false, reason: (e as Error).message };
  }
}

export async function GET() {
  if (!(await requireSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const prompts = await loadPrompts();
  return NextResponse.json({ prompts });
}

export async function PUT(req: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = PromptsV2Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid prompts", issues: parsed.error.issues }, { status: 400 });
  }
  await savePrompts(parsed.data);
  const git = await commitPromptsToGit(parsed.data, session.sub);
  return NextResponse.json({ ok: true, git });
}

// Reset to the bundled default: clear the Blob (loadPrompts falls back) and
// also commit the bundled default to git so the reset shows up in history.
export async function DELETE() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await deletePrompts();
  const defaults = PromptsV2Schema.parse(bundledDefault);
  await commitPromptsToGit(defaults, `${session.sub} (reset)`);
  return NextResponse.json({ ok: true, prompts: defaults });
}
