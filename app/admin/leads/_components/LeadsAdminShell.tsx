"use client";
import { EditorProvider } from "@/app/_editor/EditorProvider";
import { Edit } from "@/app/_editor/Edit";
import { PublishBar } from "@/app/_editor/PublishBar";
import type { Content } from "@/types/content";
import type { Lead } from "@/lib/db/schema";
import { LeadsTable } from "./LeadsTable";
import ui from "../../_components/ui.module.css";

export function LeadsAdminShell({ content, rows }: { content: Content; rows: Lead[] }) {
  const admin = content.admin.leads;
  return (
    <EditorProvider initial={content}>
      <div style={{ marginInline: -24, marginTop: -28 }}>
        <PublishBar />
      </div>
      <div style={{ marginTop: 28 }}>
        <div
          style={{
            font: "600 10px/1 var(--adv-font, system-ui)",
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: "#a1a1aa",
            marginBottom: 10,
          }}
        >
          <Edit edit path="admin.leads.eyebrow">{admin.eyebrow}</Edit>
        </div>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 600,
            margin: 0,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            color: "#18181b",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          <Edit edit path="admin.leads.title">{admin.title}</Edit>
          <button
            type="button"
            className={ui.infoTip}
            data-tip={admin.tooltip}
            aria-label="About this page"
          >
            ?
          </button>
        </h1>
        {/* Tooltip text editor (visually muted; lets Nik edit the long copy without showing it on the page). */}
        <div style={{ marginTop: 14, fontSize: 12, color: "#a1a1aa", maxWidth: 620 }}>
          <span style={{ fontWeight: 600, marginRight: 6 }}>Tooltip text:</span>
          <Edit edit path="admin.leads.tooltip" multiline>
            {admin.tooltip}
          </Edit>
        </div>
      </div>
      <div style={{ marginTop: 28 }}>
        <LeadsTable initialRows={rows} />
      </div>
    </EditorProvider>
  );
}
