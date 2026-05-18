import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, SESSION_CONFIG } from "@/lib/auth";
import { migrateContent } from "@/types/content";
import { loadDraft, deleteDraft } from "@/lib/blob";
import { getFile, putFile } from "@/lib/github";
import { sanitizeRichText } from "@/lib/richtext/sanitize";
import { RICHTEXT_FIELD_PATHS } from "@/lib/richtext/migrated-fields";

function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, k) => {
    if (acc == null || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[k];
  }, obj);
}

function setByPath(obj: any, path: string, value: unknown): void {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    cur = cur[parts[i]];
    if (cur == null) return;
  }
  cur[parts[parts.length - 1]] = value;
}

function sanitizeMigratedFields(content: any): void {
  // footer is top-level in v2
  for (const p of RICHTEXT_FIELD_PATHS) {
    if (!p.startsWith("footer.")) continue;
    const v = getByPath(content, p);
    if (typeof v === "string") setByPath(content, p, sanitizeRichText(v));
  }

  // Everything else lives under content.sections[N].data.<sectionType>.<field>
  if (!Array.isArray(content.sections)) return;
  for (const s of content.sections) {
    if (!s?.type || !s.data) continue;

    // Each section's primary data key matches its type. Find paths that target
    // this section type and sanitize the field inside s.data[s.type].
    const prefix = s.type + ".";
    for (const p of RICHTEXT_FIELD_PATHS) {
      if (!p.startsWith(prefix)) continue;
      const localKey = p.slice(prefix.length);
      const v = getByPath(s.data[s.type], localKey);
      if (typeof v === "string") setByPath(s.data[s.type], localKey, sanitizeRichText(v));
    }

    // Hero sections uniquely also contain `order` data — sanitize order.* paths
    // inside s.data.order.
    if (s.type === "hero" && s.data.order) {
      for (const p of RICHTEXT_FIELD_PATHS) {
        if (!p.startsWith("order.")) continue;
        const localKey = p.slice("order.".length);
        const v = getByPath(s.data.order, localKey);
        if (typeof v === "string") setByPath(s.data.order, localKey, sanitizeRichText(v));
      }
    }
  }
}

export async function POST() {
  const c = await cookies();
  const token = c.get(SESSION_CONFIG.cookieName)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const draft = await loadDraft();
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
    current = await getFile("content/content.json");
  } catch (e) {
    return NextResponse.json({ error: "Could not read content.json from GitHub", detail: (e as Error).message }, { status: 502 });
  }

  let currentMigrated = null;
  try {
    currentMigrated = migrateContent(current.content);
  } catch { /* current file unreadable as content — treat as changed */ }

  if (currentMigrated && JSON.stringify(currentMigrated) === JSON.stringify(migrated)) {
    await deleteDraft();
    return NextResponse.json({ ok: true, noop: true });
  }

  try {
    const r = await putFile({
      path: "content/content.json",
      content: migrated,
      sha: current.sha,
      message: `content: ${session.sub} edit (${new Date().toISOString().slice(0,10)})`,
    });
    await deleteDraft();
    return NextResponse.json({ ok: true, commit_sha: r.commitSha });
  } catch (e) {
    return NextResponse.json({ error: "GitHub commit failed", detail: (e as Error).message }, { status: 502 });
  }
}
