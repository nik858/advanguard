import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { verifySession, SESSION_CONFIG } from "@/lib/auth";
import { insertLead, listLeads } from "@/lib/db/leads";

export const runtime = "nodejs";

async function requireSession() {
  const c = await cookies();
  const token = c.get(SESSION_CONFIG.cookieName)?.value;
  return token ? await verifySession(token) : null;
}

const ListQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(200),
  offset: z.coerce.number().int().min(0).default(0),
});

const CreateBody = z.object({
  email: z.string().email(),
  first_name: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  domain: z.string().trim().optional().nullable(),
});

export async function GET(req: Request) {
  if (!(await requireSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const parsed = ListQuery.safeParse({
    limit: searchParams.get("limit") ?? undefined,
    offset: searchParams.get("offset") ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: "bad query" }, { status: 400 });

  const rows = await listLeads(parsed.data);
  return NextResponse.json({ rows });
}

export async function POST(req: Request) {
  if (!(await requireSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = CreateBody.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const row = await insertLead({
    email: parsed.data.email,
    firstName: parsed.data.first_name ?? null,
    phone: parsed.data.phone ?? null,
    domain: parsed.data.domain ?? null,
    source: "manual",
  });
  return NextResponse.json({ row }, { status: 201 });
}
