import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySession, SESSION_CONFIG } from "@/lib/auth";
import { cookies } from "next/headers";
import { saveDraft, loadDraft, deleteDraft } from "@/lib/blob";
import { migrateContent } from "@/types/content";
import { parseVariant, VARIANTS } from "@/lib/landing/variants";

async function requireSession() {
  const c = await cookies();
  const token = c.get(SESSION_CONFIG.cookieName)?.value;
  return token ? await verifySession(token) : null;
}

/** Which landing page this draft belongs to — free unless stated otherwise. */
function draftKeyFor(req: Request): string {
  const variant = parseVariant(new URL(req.url).searchParams.get("variant"));
  return VARIANTS[variant].draftKey;
}

export async function GET(req: Request) {
  if (!(await requireSession())) return new NextResponse("Unauthorized", { status: 401 });
  const draft = await loadDraft(draftKeyFor(req));
  return NextResponse.json({ draft });
}

const PutBody = z.object({ draft: z.unknown() });
export async function PUT(req: Request) {
  if (!(await requireSession())) return new NextResponse("Unauthorized", { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = PutBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  let migrated;
  try {
    migrated = migrateContent(parsed.data.draft);
  } catch (e) {
    return NextResponse.json({ error: "Invalid content shape", detail: (e as Error).message }, { status: 400 });
  }
  await saveDraft(migrated, draftKeyFor(req));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!(await requireSession())) return new NextResponse("Unauthorized", { status: 401 });
  await deleteDraft(draftKeyFor(req));
  return NextResponse.json({ ok: true });
}
