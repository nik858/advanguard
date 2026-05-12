import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySession, SESSION_CONFIG } from "@/lib/auth";
import { cookies } from "next/headers";
import { saveDraft, loadDraft, deleteDraft } from "@/lib/blob";
import { ContentSchema } from "@/types/content";

async function requireSession() {
  const c = await cookies();
  const token = c.get(SESSION_CONFIG.cookieName)?.value;
  return token ? await verifySession(token) : null;
}

export async function GET() {
  if (!(await requireSession())) return new NextResponse("Unauthorized", { status: 401 });
  const draft = await loadDraft();
  return NextResponse.json({ draft });
}

const PutBody = z.object({ draft: z.unknown() });
export async function PUT(req: Request) {
  if (!(await requireSession())) return new NextResponse("Unauthorized", { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = PutBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const draftCheck = ContentSchema.safeParse(parsed.data.draft);
  if (!draftCheck.success) return NextResponse.json({ error: "Invalid content shape", issues: draftCheck.error.issues }, { status: 400 });
  await saveDraft(draftCheck.data);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  if (!(await requireSession())) return new NextResponse("Unauthorized", { status: 401 });
  await deleteDraft();
  return NextResponse.json({ ok: true });
}
