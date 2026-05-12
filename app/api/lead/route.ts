import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { postLeadToGHL } from "@/lib/ghl";
import { checkLimit, clientIp, leadLimiter } from "@/lib/ratelimit";

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
  vertical: z.string().optional(),
  website: z.string().optional(), // honeypot
});

export async function POST(req: Request) {
  const ip = clientIp(req);
  const limit = await checkLimit(leadLimiter, ip);
  if (!limit.success) return NextResponse.json({ error: "Trop de soumissions" }, { status: 429 });

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Email invalide" }, { status: 400 });

  // Honeypot: silently 200 if filled
  if (parsed.data.website && parsed.data.website.trim().length > 0) {
    return NextResponse.json({ ok: true });
  }

  const domain = parsed.data.email.split("@")[1].toLowerCase();
  if (BLOCKED_DOMAINS.has(domain)) {
    return NextResponse.json({ error: "Veuillez utiliser une adresse professionnelle." }, { status: 400 });
  }

  const ip_hash = crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);
  try {
    await postLeadToGHL({
      email: parsed.data.email,
      first_name: parsed.data.first_name,
      phone: parsed.data.phone,
      vertical: parsed.data.vertical,
      domain,
      user_agent: req.headers.get("user-agent") || "",
      ip_hash,
    });
  } catch (e) {
    console.error("[lead] GHL forward failed", e);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
