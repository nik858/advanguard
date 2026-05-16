"use client";
import { EditorProvider } from "@/app/_editor/EditorProvider";
import { Edit } from "@/app/_editor/Edit";
import type { Content } from "@/types/content";
import type { Lead } from "@/lib/db/schema";
import { LeadsTable } from "./LeadsTable";
import { PublishPill } from "./PublishPill";
import ui from "../../_components/ui.module.css";

export function LeadsAdminShell({ content, rows }: { content: Content; rows: Lead[] }) {
  const admin = content.admin.leads;
  return (
    <EditorProvider initial={content}>
      <div>
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
      </div>
      <div style={{ marginTop: 28 }}>
        <LeadsTable initialRows={rows} />
      </div>
      <PublishPill />
    </EditorProvider>
  );
}
