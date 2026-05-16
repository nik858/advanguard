import contentJson from "@/content/content.json";
import { migrateContent } from "@/types/content";
import { listLeads } from "@/lib/db/leads";
import { BackLink } from "../_components/BackLink";
import { LeadsAdminShell } from "./_components/LeadsAdminShell";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const [rows, content] = await Promise.all([
    listLeads({ limit: 200, offset: 0 }),
    Promise.resolve(migrateContent(contentJson)),
  ]);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <BackLink />
      <LeadsAdminShell content={content} rows={rows} />
    </div>
  );
}
