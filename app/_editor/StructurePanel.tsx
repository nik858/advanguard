"use client";
import { useState } from "react";
import { useEditor } from "./EditorProvider";
import { SortableList } from "./SortableList";
import { SectionRow } from "./SectionRow";
import { AddSectionMenu } from "./AddSectionMenu";

export function StructurePanel() {
  const { state, reorderSections } = useEditor();
  const [open, setOpen] = useState(false);

  if (state.previewMode) return null;
  const sections = state.draft.sections;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Section structure"
        style={{
          position: "fixed",
          left: 0,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 90,
          background: "#fff",
          border: "1px solid var(--adv-border, #e7e7ea)",
          borderLeft: 0,
          borderRadius: "0 8px 8px 0",
          padding: "12px 6px",
          cursor: "pointer",
          writingMode: "vertical-rl",
          fontSize: 12,
          fontWeight: 600,
          fontFamily: "var(--adv-font, system-ui, sans-serif)",
          color: "var(--adv-text, #18181b)",
          boxShadow: "0 2px 12px rgba(0,0,0,.08)",
        }}
      >
        ⠿ Structure
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        bottom: 0,
        width: 260,
        zIndex: 90,
        background: "rgba(255,255,255,0.97)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRight: "1px solid var(--adv-border, #e7e7ea)",
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        fontFamily: "var(--adv-font, system-ui, sans-serif)",
        overflowY: "auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <strong style={{ fontSize: 13, color: "var(--adv-text, #18181b)" }}>Structure</strong>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close structure panel"
          style={{ background: "transparent", border: 0, cursor: "pointer", fontSize: 16, lineHeight: 1, color: "var(--adv-text-muted, #71717a)" }}
        >
          ‹
        </button>
      </div>

      <div style={{ flex: 1 }}>
        <SortableList ids={sections.map((s) => s.id)} onReorder={reorderSections}>
          {(id, handle) => {
            const section = sections.find((s) => s.id === id);
            if (!section) return null;
            return <SectionRow section={section} handle={handle} />;
          }}
        </SortableList>
      </div>

      <AddSectionMenu />
    </div>
  );
}
