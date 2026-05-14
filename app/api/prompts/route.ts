import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, SESSION_CONFIG } from "@/lib/auth";
import { PromptsSchema } from "@/types/prompts";
import { loadPrompts } from "@/lib/audit/prompts";
import { savePrompts, deletePrompts } from "@/lib/blob";

async function requireSession() {
  const c = await cookies();
  const token = c.get(SESSION_CONFIG.cookieName)?.value;
  return token ? await verifySession(token) : null;
}

export async function GET() {
  if (!(await requireSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const prompts = await loadPrompts();
  return NextResponse.json({ prompts });
}

export async function PUT(req: Request) {
  if (!(await requireSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = PromptsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid prompts", issues: parsed.error.issues }, { status: 400 });
  }
  await savePrompts(parsed.data);
  return NextResponse.json({ ok: true });
}

// Reset to the bundled default: delete the Blob copy so loadPrompts() falls back.
export async function DELETE() {
  if (!(await requireSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await deletePrompts();
  const prompts = await loadPrompts(); // now returns the bundled default
  return NextResponse.json({ ok: true, prompts });
}
