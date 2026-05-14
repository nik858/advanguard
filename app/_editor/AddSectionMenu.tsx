"use client";
import { useState } from "react";
import { useEditor } from "./EditorProvider";
import { SECTION_TYPES, SECTION_LABELS, type SectionType } from "@/types/content";

export function AddSectionMenu() {
  const { addSection } = useEditor();
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          background: "#fff",
          border: "1px dashed var(--adv-accent, #1c7bfd)",
          color: "var(--adv-accent, #1c7bfd)",
          borderRadius: 8,
          padding: "8px 12px",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 600,
          fontFamily: "inherit",
        }}
      >
        + Add a section
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid var(--adv-border, #e7e7ea)",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,.12)",
            padding: 4,
            zIndex: 10,
          }}
        >
          {SECTION_TYPES.map((t: SectionType) => (
            <button
              key={t}
              type="button"
              onClick={() => { addSection(t); setOpen(false); }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                background: "transparent",
                border: 0,
                padding: "7px 10px",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 13,
                fontFamily: "inherit",
                color: "var(--adv-text, #18181b)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f7")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {SECTION_LABELS[t]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
