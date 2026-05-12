import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, SESSION_CONFIG } from "@/lib/auth";
import { ContentSchema } from "@/types/content";
import { loadDraft, deleteDraft } from "@/lib/blob";
import { getFile, putFile } from "@/lib/github";

export async function POST() {
  const c = await cookies();
  const token = c.get(SESSION_CONFIG.cookieName)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const draft = await loadDraft();
  if (!draft) return NextResponse.json({ error: "Aucun brouillon à publier" }, { status: 400 });

  const parsed = ContentSchema.safeParse(draft);
  if (!parsed.success) {
    return NextResponse.json({ error: "Contenu invalide", issues: parsed.error.issues }, { status: 400 });
  }

  let current;
  try {
    current = await getFile("content/content.json");
  } catch (e) {
    return NextResponse.json({ error: "Impossible de lire content.json depuis GitHub", detail: (e as Error).message }, { status: 502 });
  }

  if (JSON.stringify(current.content) === JSON.stringify(parsed.data)) {
    await deleteDraft();
    return NextResponse.json({ ok: true, noop: true });
  }

  try {
    const r = await putFile({
      path: "content/content.json",
      content: parsed.data,
      sha: current.sha,
      message: `content: ${session.sub} edit (${new Date().toISOString().slice(0,10)})`,
    });
    await deleteDraft();
    return NextResponse.json({ ok: true, commit_sha: r.commitSha });
  } catch (e) {
    return NextResponse.json({ error: "Échec du commit GitHub", detail: (e as Error).message }, { status: 502 });
  }
}
