import { NextResponse, after } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { checkLimit, clientIp, leadLimiter } from "@/lib/ratelimit";
import { runAudit } from "@/lib/audit/index";
import { extractDomain } from "@/lib/audit/domain";
import { insertLead } from "@/lib/db/leads";
import { CLINIC_TYPES } from "@/lib/leads/clinic-types";
import type { Lead } from "@/types/audit";

// The audit runs in the background via after(); give the function room to finish.
export const maxDuration = 300;

const BLOCKED_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.fr", "ymail.com",
  "outlook.com", "hotmail.com", "live.com", "msn.com",
  "icloud.com", "me.com", "mac.com",
  "proton.me", "protonmail.com",
  "aol.com", "gmx.com", "mail.com",
]);

const BodySchema = z.object({
  email: z.string().email(),
  first_name: z.string().optional(),
  phone: z.string().optional(),
  clinic_type: z.enum(CLINIC_TYPES).optional(),
  website: z.string().optional(), // honeypot
});

export async function POST(req: Request) {
  const ip = clientIp(req);
  const limit = await checkLimit(leadLimiter, ip);
  if (!limit.success) return NextResponse.json({ error: "Too many submissions" }, { status: 429 });

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid email" }, { status: 400 });

  // Honeypot: silently accept (200) but do nothing — bots think they succeeded.
  if (parsed.data.website && parsed.data.website.trim().length > 0) {
    return NextResponse.json({ ok: true });
  }

  const domain = extractDomain(parsed.data.email);
  if (BLOCKED_DOMAINS.has(domain)) {
    return NextResponse.json({ error: "Please use a work email address." }, { status: 400 });
  }

  let row: Awaited<ReturnType<typeof insertLead>>;
  try {
    row = await insertLead({
      email: parsed.data.email,
      firstName: parsed.data.first_name || null,
      phone: parsed.data.phone ?? null,
      domain,
      source: "inbound",
      clinicType: parsed.data.clinic_type ?? null,
    });
  } catch (e) {
    console.error("[lead] db insert failed", { domain, error: String(e) });
    return NextResponse.json({ ok: true });
  }

  const lead: Lead = {
    id: row.id,
    email: parsed.data.email,
    firstName: parsed.data.first_name || "",
    phone: parsed.data.phone,
    domain,
    userAgent: req.headers.get("user-agent") || "",
    ipHash: crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16),
  };

  // Respond immediately; the audit pipeline runs in the background.
  after(() => runAudit(lead));

  return NextResponse.json({ ok: true });
}
