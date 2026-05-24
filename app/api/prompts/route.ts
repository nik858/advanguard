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

/**
 * Tries to write to the Blob but never throws. The blob is the fast/runtime
 * path; the git commit (below) is the durable source of truth — losing the
 * blob write only delays propagation by ~1 deploy, it doesn't lose data.
 */
async function trySaveBlob(prompts: PromptsV2): Promise<{ ok: boolean; reason?: string }> {
  try {
    await savePrompts(prompts);
    return { ok: true };
  } catch (e) {
    const reason = (e as Error).message;
    console.warn("[prompts] blob save skipped:", reason);
    return { ok: false, reason };
  }
}

async function tryDeleteBlob(): Promise<{ ok: boolean; reason?: string }> {
  try {
    await deletePrompts();
    return { ok: true };
  } catch (e) {
    const reason = (e as Error).message;
    console.warn("[prompts] blob delete skipped:", reason);
    return { ok: false, reason };
  }
}

export async function PUT(req: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = PromptsV2Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid prompts", issues: parsed.error.issues }, { status: 400 });
  }
  // Save to both targets — even if one fails the other still preserves the
  // user's edit. Save is considered successful as long as at least one of
  // them landed (so a paused Blob store does not prevent the operator from
  // working — the git commit + next deploy makes the change live).
  const blob = await trySaveBlob(parsed.data);
  const git = await commitPromptsToGit(parsed.data, session.sub);
  if (!blob.ok && !git.committed) {
    return NextResponse.json(
      { error: "Save failed", blob: blob.reason, git: git.reason },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, blob, git });
}

// Reset to the bundled default: clear the Blob (loadPrompts falls back) and
// also commit the bundled default to git so the reset shows up in history.
export async function DELETE() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const blob = await tryDeleteBlob();
  const defaults = PromptsV2Schema.parse(bundledDefault);
  const git = await commitPromptsToGit(defaults, `${session.sub} (reset)`);
  return NextResponse.json({ ok: true, prompts: defaults, blob, git });
}
