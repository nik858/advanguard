"use client";
import { useState, type ReactNode } from "react";
import { useEditor } from "./EditorProvider";
import { SECTION_LABELS, type SectionType } from "@/types/content";

export function SectionHoverFrame({ type, children }: { type: SectionType; children: ReactNode }) {
  const { state } = useEditor();
  const [hover, setHover] = useState(false);

  if (state.previewMode) return <>{children}</>;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        outline: hover ? "2px solid rgba(28,123,253,0.4)" : "2px solid transparent",
        outlineOffset: -2,
        transition: "outline-color 120ms",
      }}
    >
      {hover && (
        <span
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            zIndex: 80,
            background: "var(--adv-accent, #1c7bfd)",
            color: "#fff",
            fontSize: 11,
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: "0 0 6px 0",
            fontFamily: "var(--adv-font, system-ui, sans-serif)",
            pointerEvents: "none",
          }}
        >
          {SECTION_LABELS[type]}
        </span>
      )}
      {children}
    </div>
  );
}
