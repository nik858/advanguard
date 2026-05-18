"use client";
import { useEffect, useRef, useState } from "react";
import { RICHTEXT_PALETTE } from "@/lib/richtext/palette";
import {
  wrapSelection,
  unwrapAroundSelection,
  isSelectionWrappedBy,
} from "@/lib/richtext/selection";

type Props = {
  range: Range;
  host: HTMLElement;
  onMutated: () => void;
};

const btn: React.CSSProperties = {
  background: "transparent",
  border: 0,
  padding: "4px 8px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  color: "#18181b",
  borderRadius: 4,
  fontFamily: "var(--adv-font, system-ui, sans-serif)",
};
const btnActive: React.CSSProperties = {
  ...btn,
  background: "#1c7bfd",
  color: "#fff",
};

export function RichTextToolbar({ range, host, onMutated }: Props) {
  const [view, setView] = useState<"main" | "color">("main");
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    function reposition() {
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;
      const top = rect.top - 44;
      const left = Math.max(8, rect.left + rect.width / 2 - 110);
      setPos({ top, left });
    }
    reposition();
    window.addEventListener("scroll", reposition, { passive: true });
    return () => window.removeEventListener("scroll", reposition);
  }, [range]);

  function applyToggle(tag: "strong" | "em" | "u") {
    if (isSelectionWrappedBy(range, tag, host)) {
      unwrapAroundSelection(range, tag);
    } else {
      wrapSelection(range, tag);
    }
    onMutated();
  }

  function applyColor(hex: string) {
    if (isSelectionWrappedBy(range, "span", host)) {
      unwrapAroundSelection(range, "span");
    }
    wrapSelection(range, "span", { style: `color:${hex}` });
    setView("main");
    onMutated();
  }

  function clearColor() {
    if (isSelectionWrappedBy(range, "span", host)) {
      unwrapAroundSelection(range, "span");
    }
    setView("main");
    onMutated();
  }

  const activeBold = isSelectionWrappedBy(range, "strong", host);
  const activeItalic = isSelectionWrappedBy(range, "em", host);
  const activeUnder = isSelectionWrappedBy(range, "u", host);

  return (
    <div
      ref={ref}
      data-rich-text-toolbar="true"
      tabIndex={-1}
      onMouseDown={(e) => e.preventDefault()}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        zIndex: 200,
        background: "#fff",
        border: "1px solid var(--adv-border, #e7e7ea)",
        borderRadius: 8,
        boxShadow: "0 8px 24px rgba(0,0,0,.16)",
        padding: 4,
        display: "flex",
        flexDirection: view === "color" ? "column" : "row",
        gap: 4,
        fontFamily: "var(--adv-font, system-ui, sans-serif)",
      }}
    >
      {view === "main" && (
        <>
          <button data-rich-text-toolbar="true" type="button" style={activeBold ? btnActive : btn} onClick={() => applyToggle("strong")}>B</button>
          <button data-rich-text-toolbar="true" type="button" style={{ ...(activeItalic ? btnActive : btn), fontStyle: "italic" }} onClick={() => applyToggle("em")}>I</button>
          <button data-rich-text-toolbar="true" type="button" style={{ ...(activeUnder ? btnActive : btn), textDecoration: "underline" }} onClick={() => applyToggle("u")}>U</button>
          <button data-rich-text-toolbar="true" type="button" style={btn} onClick={() => setView("color")}>color</button>
        </>
      )}
      {view === "color" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 24px)", gap: 6, padding: 4 }}>
            {RICHTEXT_PALETTE.map((c) => (
              <button
                key={c.hex}
                data-rich-text-toolbar="true"
                type="button"
                aria-label={c.label}
                onClick={() => applyColor(c.hex)}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: c.hex,
                  border: c.hex === "#ffffff" ? "1px solid #e7e7ea" : "1px solid rgba(0,0,0,0.06)",
                  cursor: "pointer",
                  padding: 0,
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", gap: 4, padding: "0 4px 4px" }}>
            <button data-rich-text-toolbar="true" type="button" style={btn} onClick={clearColor}>x Clear</button>
            <button data-rich-text-toolbar="true" type="button" style={btn} onClick={() => setView("main")}>back</button>
          </div>
        </>
      )}
    </div>
  );
}
