import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { verifySession, SESSION_CONFIG } from "@/lib/auth";
import { deleteLead, getLead, updateLeadFields, updateLeadStatus } from "@/lib/db/leads";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/db/schema";
import { CLINIC_TYPES } from "@/lib/leads/clinic-types";

export const runtime = "nodejs";

async function requireSession() {
  const c = await cookies();
  const token = c.get(SESSION_CONFIG.cookieName)?.value;
  return token ? await verifySession(token) : null;
}

const PatchBody = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  email: z.string().email().optional(),
  first_name: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  domain: z.string().trim().optional().nullable(),
  clinic_type: z.enum(CLINIC_TYPES).optional().nullable(),
}).refine(
  (b) =>
    b.status !== undefined ||
    b.email !== undefined ||
    b.first_name !== undefined ||
    b.phone !== undefined ||
    b.domain !== undefined ||
    b.clinic_type !== undefined,
  { message: "no fields to update" },
);

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
  if (
    parsed.data.email !== undefined ||
    parsed.data.first_name !== undefined ||
    parsed.data.phone !== undefined ||
    parsed.data.domain !== undefined ||
    parsed.data.clinic_type !== undefined
  ) {
    await updateLeadFields({
      id,
      ...(parsed.data.email !== undefined ? { email: parsed.data.email } : {}),
      ...(parsed.data.first_name !== undefined ? { firstName: parsed.data.first_name } : {}),
      ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone } : {}),
      ...(parsed.data.domain !== undefined ? { domain: parsed.data.domain } : {}),
      ...(parsed.data.clinic_type !== undefined ? { clinicType: parsed.data.clinic_type } : {}),
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
