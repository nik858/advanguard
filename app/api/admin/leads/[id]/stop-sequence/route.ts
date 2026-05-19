import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { verifySession, SESSION_CONFIG } from "@/lib/auth";
import { getLead, markSequenceStopped, type ScheduledEmail } from "@/lib/db/leads";
import { cancelScheduledEmail } from "@/lib/email";

export const runtime = "nodejs";

async function requireSession() {
  const c = await cookies();
  const token = c.get(SESSION_CONFIG.cookieName)?.value;
  return token ? await verifySession(token) : null;
}

const UuidSchema = z.string().uuid();

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!UuidSchema.safeParse(id).success) return NextResponse.json({ error: "bad id" }, { status: 400 });

  const lead = await getLead(id);
  if (!lead) return NextResponse.json({ error: "not found" }, { status: 404 });

  const current = (lead.scheduledEmails ?? []) as ScheduledEmail[];
  if (current.length === 0) {
    return NextResponse.json({ ok: true, cancelled: 0, row: lead });
  }

  let cancelledCount = 0;
  const next: ScheduledEmail[] = [];
  for (const entry of current) {
    if (entry.status === "scheduled" && entry.resend_id) {
      try {
        await cancelScheduledEmail(entry.resend_id);
        cancelledCount += 1;
        next.push({ ...entry, status: "cancelled", reason: "stopped by admin" });
      } catch (e) {
        console.error("[stop-sequence] cancel failed", { id, tab: entry.tab, error: String(e) });
        next.push({ ...entry, reason: `cancel failed: ${e instanceof Error ? e.message : String(e)}` });
      }
    } else {
      next.push(entry);
    }
  }

  await markSequenceStopped(id, next);
  const row = await getLead(id);
  return NextResponse.json({ ok: true, cancelled: cancelledCount, row });
}
