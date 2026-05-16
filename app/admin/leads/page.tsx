import { LeadsTable } from "./_components/LeadsTable";
import { listLeads } from "@/lib/db/leads";
import { BackLink } from "../_components/BackLink";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const rows = await listLeads({ limit: 200, offset: 0 });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <BackLink />
      <div>
        <div style={{ font: "600 10px/1 var(--adv-font, system-ui)", textTransform: "uppercase", letterSpacing: "0.18em", color: "#a1a1aa", marginBottom: 10 }}>
          CRM · Leads
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 600, margin: "0 0 8px", letterSpacing: "-0.02em", lineHeight: 1.1, color: "#18181b" }}>
          Every lead in one place.
        </h1>
        <p style={{ color: "#71717a", margin: 0, fontSize: 15, lineHeight: 1.55, maxWidth: 620 }}>
          Inbound submissions land here automatically. Add manual leads with the button above. Click a row for details.
        </p>
      </div>
      <LeadsTable initialRows={rows} />
    </div>
  );
}
