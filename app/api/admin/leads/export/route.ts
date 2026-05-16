import { cookies } from "next/headers";
import { verifySession, SESSION_CONFIG } from "@/lib/auth";
import { exportLeadsForCsv } from "@/lib/db/leads";
import { leadsToCsv } from "@/lib/csv";

export const runtime = "nodejs";

async function requireSession() {
  const c = await cookies();
  const token = c.get(SESSION_CONFIG.cookieName)?.value;
  return token ? await verifySession(token) : null;
}

export async function GET() {
  if (!(await requireSession())) return new Response("Unauthorized", { status: 401 });

  const rows = await exportLeadsForCsv();
  const csv = leadsToCsv(rows);
  const filename = `leads-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
