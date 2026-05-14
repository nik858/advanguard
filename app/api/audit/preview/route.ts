import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { verifySession, SESSION_CONFIG } from "@/lib/auth";
import { PromptsSchema } from "@/types/prompts";
import { extractDomain } from "@/lib/audit/domain";
import { runAuditPipeline } from "@/lib/audit/index";
import type { Lead } from "@/types/audit";

// The preview runs the full real pipeline (scrape + PageSpeed + Claude) synchronously.
export const maxDuration = 300;

async function requireSession() {
  const c = await cookies();
  const token = c.get(SESSION_CONFIG.cookieName)?.value;
  return token ? await verifySession(token) : null;
}

const BodySchema = z.object({
  email: z.string().email(),
  prompts: PromptsSchema.optional(),
});

export async function POST(req: Request) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const lead: Lead = {
    email: parsed.data.email,
    firstName: "",
    domain: extractDomain(parsed.data.email),
  };

  // runAuditPipeline never throws and never touches GHL — safe to await directly.
  const result = await runAuditPipeline(lead, parsed.data.prompts);
  return NextResponse.json({
    outcome: result.outcome,
    reason: result.reason ?? null,
    signals: result.signals,
    email: result.email,
  });
}
