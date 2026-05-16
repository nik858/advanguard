import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { verifySession, SESSION_CONFIG } from "@/lib/auth";
import { deleteLead, getLead, updateLeadFields, updateLeadStatus } from "@/lib/db/leads";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/db/schema";

export const runtime = "nodejs";

async function requireSession() {
  const c = await cookies();
  const token = c.get(SESSION_CONFIG.cookieName)?.value;
  return token ? await verifySession(token) : null;
}

const PatchBody = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  first_name: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
}).refine((b) => b.status !== undefined || b.first_name !== undefined || b.phone !== undefined, {
  message: "no fields to update",
});

const UuidSchema = z.string().uuid();

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!UuidSchema.safeParse(id).success) return NextResponse.json({ error: "bad id" }, { status: 400 });

  const row = await getLead(id);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ row });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!UuidSchema.safeParse(id).success) return NextResponse.json({ error: "bad id" }, { status: 400 });

  const json = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  if (parsed.data.status) {
    await updateLeadStatus({ id, status: parsed.data.status as LeadStatus });
  }
  if (parsed.data.first_name !== undefined || parsed.data.phone !== undefined) {
    await updateLeadFields({
      id,
      firstName: parsed.data.first_name ?? null,
      phone: parsed.data.phone ?? null,
    });
  }

  const row = await getLead(id);
  return NextResponse.json({ row });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!UuidSchema.safeParse(id).success) return NextResponse.json({ error: "bad id" }, { status: 400 });

  await deleteLead(id);
  return NextResponse.json({ ok: true });
}
