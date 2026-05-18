"use client";
import { useState } from "react";
import { useEditor } from "./EditorProvider";
import { ConfirmDialog } from "../_components/ConfirmDialog";
import { SECTION_LABELS } from "@/types/content";
import type { Section } from "@/types/content";
import type { SortableHandle } from "./SortableList";

const menuItemStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  background: "transparent",
  border: 0,
  padding: "6px 10px",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 13,
  fontFamily: "inherit",
};

export function SectionRow({ section, handle }: { section: Section; handle: SortableHandle }) {
  const { setSectionHidden, duplicateSection, removeSection, setSectionStyle } = useEditor();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [spacingOpen, setSpacingOpen] = useState(false);
  const hidden = Boolean(section.hidden);

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 8px",
          marginBottom: 4,
          borderRadius: 6,
          border: "1px solid var(--adv-border, #e7e7ea)",
          background: "#fff",
          opacity: hidden ? 0.5 : 1,
          fontSize: 13,
        }}
      >
        <button
          type="button"
          {...handle.attributes}
          {...handle.listeners}
          aria-label="Drag to reorder"
          style={{
            cursor: "grab",
            background: "transparent",
            border: 0,
            color: "var(--adv-text-muted, #71717a)",
            fontSize: 14,
            lineHeight: 1,
            padding: 2,
          }}
        >
          ⠿
        </button>
        <span style={{ flex: 1, fontWeight: 500, color: "var(--adv-text, #18181b)" }}>
          {SECTION_LABELS[section.type]}
        </span>
        <button
          type="button"
          onClick={() => setSectionHidden(section.id, !hidden)}
          aria-label={hidden ? "Show section" : "Hide section"}
          title={hidden ? "Show" : "Hide"}
          style={{ background: "transparent", border: 0, cursor: "pointer", fontSize: 13, padding: 2 }}
        >
          {hidden ? "🙈" : "👁"}
        </button>
        <div style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="More actions"
            style={{ background: "transparent", border: 0, cursor: "pointer", fontSize: 15, padding: 2, lineHeight: 1 }}
          >
            ⋯
          </button>
          {menuOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                right: 0,
                background: "#fff",
                border: "1px solid var(--adv-border, #e7e7ea)",
                borderRadius: 6,
                boxShadow: "0 8px 24px rgba(0,0,0,.12)",
                padding: 4,
                zIndex: 20,
                minWidth: 120,
              }}
            >
              <button
                type="button"
                onClick={() => { duplicateSection(section.id); setMenuOpen(false); }}
                style={menuItemStyle}
              >
                Duplicate
              </button>
              <button
                type="button"
                onClick={() => { setMenuOpen(false); setSpacingOpen(true); }}
                style={menuItemStyle}
              >
                Spacing...
              </button>
              <button
                type="button"
                onClick={() => { setMenuOpen(false); setConfirmOpen(true); }}
                style={{ ...menuItemStyle, color: "#c62828" }}
              >
                Delete
              </button>
            </div>
          )}
          {spacingOpen && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid var(--adv-border, #e7e7ea)", borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,.12)", padding: 12, marginTop: 4, zIndex: 25 }}>
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: "block", fontSize: 11, color: "#71717a", marginBottom: 4 }}>
                  Top margin: {section.style?.mt ?? 0}px
                </label>
                <input
                  type="range"
                  min={0}
                  max={200}
                  step={8}
                  value={section.style?.mt ?? 0}
                  onChange={(e) => setSectionStyle(section.id, { ...section.style, mt: Number(e.target.value) })}
                  style={{ width: "100%" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "#71717a", marginBottom: 4 }}>
                  Bottom margin: {section.style?.mb ?? 0}px
                </label>
                <input
                  type="range"
                  min={0}
                  max={200}
                  step={8}
                  value={section.style?.mb ?? 0}
                  onChange={(e) => setSectionStyle(section.id, { ...section.style, mb: Number(e.target.value) })}
                  style={{ width: "100%" }}
                />
              </div>
              <button type="button" onClick={() => setSpacingOpen(false)} style={{ marginTop: 8, background: "transparent", border: 0, color: "#71717a", fontSize: 12, cursor: "pointer", padding: 0 }}>Close</button>
            </div>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title={`Delete "${SECTION_LABELS[section.type]}"?`}
        description="This section will be removed from the page. You can still discard all changes before publishing."
        confirmLabel="Delete section"
        cancelLabel="Keep it"
        destructive
        onConfirm={() => { removeSection(section.id); setConfirmOpen(false); }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
