import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, SESSION_CONFIG } from "@/lib/auth";
import { migrateContent } from "@/types/content";
import { loadDraft, deleteDraft } from "@/lib/blob";
import { getFile, putFile } from "@/lib/github";
import { sanitizeRichText } from "@/lib/richtext/sanitize";
import { parseVariant, VARIANTS } from "@/lib/landing/variants";

function sanitizeAllStrings(obj: any): void {
  if (obj == null) return;
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const v = obj[i];
      if (typeof v === "string") obj[i] = sanitizeRichText(v);
      else if (typeof v === "object") sanitizeAllStrings(v);
    }
    return;
  }
  if (typeof obj === "object") {
    for (const key of Object.keys(obj)) {
      const v = obj[key];
      if (typeof v === "string") obj[key] = sanitizeRichText(v);
      else if (typeof v === "object") sanitizeAllStrings(v);
    }
  }
}

function sanitizeMigratedFields(content: any): void {
  sanitizeAllStrings(content);
}

export async function POST(req: Request) {
  const c = await cookies();
  const token = c.get(SESSION_CONFIG.cookieName)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Each landing page publishes to its own content file.
  const variant = parseVariant(new URL(req.url).searchParams.get("variant"));
  const { contentFile, draftKey, label } = VARIANTS[variant];

  const draft = await loadDraft(draftKey);
  if (!draft) return NextResponse.json({ error: "No draft to publish" }, { status: 400 });

  let migrated;
  try {
    migrated = migrateContent(draft);
  } catch (e) {
    return NextResponse.json({ error: "Invalid content", detail: (e as Error).message }, { status: 400 });
  }

  sanitizeMigratedFields(migrated);

  let current;
  try {
    current = await getFile(contentFile);
  } catch (e) {
    return NextResponse.json({ error: `Could not read ${contentFile} from GitHub`, detail: (e as Error).message }, { status: 502 });
  }

  let currentMigrated = null;
  try {
    currentMigrated = migrateContent(current.content);
  } catch { /* current file unreadable as content — treat as changed */ }

  if (currentMigrated && JSON.stringify(currentMigrated) === JSON.stringify(migrated)) {
    await deleteDraft(draftKey);
    return NextResponse.json({ ok: true, noop: true });
  }

  try {
    const r = await putFile({
      path: contentFile,
      content: migrated,
      sha: current.sha,
      message: `content: ${session.sub} edit — ${label} (${new Date().toISOString().slice(0,10)})`,
    });
    await deleteDraft(draftKey);
    return NextResponse.json({ ok: true, commit_sha: r.commitSha });
  } catch (e) {
    return NextResponse.json({ error: "GitHub commit failed", detail: (e as Error).message }, { status: 502 });
  }
}
