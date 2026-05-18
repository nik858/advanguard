"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { RICHTEXT_PALETTE } from "@/lib/richtext/palette";

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

function runExecCommand(command: string, value?: string): boolean {
  // Try/catch because some browsers throw on unrecognized commands.
  try {
    return document.execCommand(command, false, value);
  } catch {
    return false;
  }
}

/**
 * Walks the selection's start/end containers up to `host` and removes any
 * inline `color:` rules along the way. Used for the "clear color" action
 * since execCommand has no native equivalent for unsetting fore-color.
 */
function clearColorAroundSelection(range: Range, host: HTMLElement): void {
  const nodesToClean = new Set<Element>();
  function walkUp(node: Node) {
    let cur: Node | null = node;
    while (cur && cur !== host) {
      if (cur.nodeType === 1) nodesToClean.add(cur as Element);
      cur = cur.parentNode;
    }
  }
  walkUp(range.startContainer);
  walkUp(range.endContainer);
  for (const el of nodesToClean) {
    if (el.tagName.toLowerCase() === "font") el.removeAttribute("color");
    if (el.hasAttribute("style")) {
      const next = (el.getAttribute("style") || "")
        .split(";")
        .map((r) => r.trim())
        .filter((r) => r && !/^color\s*:/i.test(r))
        .join("; ");
      if (next) el.setAttribute("style", next);
      else el.removeAttribute("style");
    }
  }
}

export function RichTextToolbar({ range, host, onMutated }: Props) {
  const [view, setView] = useState<"main" | "color">("main");
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    function reposition() {
      // Prefer the LIVE selection (post-mutation accurate) over the prop range
      // (which may be stale after execCommand wraps text in a new element).
      const sel = window.getSelection();
      const liveRange = sel && sel.rangeCount > 0 && !sel.isCollapsed ? sel.getRangeAt(0) : null;
      const sourceRange = liveRange ?? range;
      let rect = sourceRange.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        const node = sourceRange.startContainer;
        const el = node.nodeType === 1 ? (node as Element) : node.parentElement;
        if (el) rect = el.getBoundingClientRect();
      }
      if (rect.width === 0 && rect.height === 0) return;
      // Always place the toolbar just above the selection (never below).
      // Clamp to at least 8 from the viewport top so it stays visible — if
      // the selection is at the very top, the toolbar may slightly overlap
      // it, but the user always sees and can use the toolbar.
      const TOOLBAR_HEIGHT = 40;
      const GAP = 8;
      const top = Math.max(8, rect.top - TOOLBAR_HEIGHT - GAP);
      // Clamp left so a ~220px-wide toolbar always fits horizontally.
      const rawLeft = rect.left + rect.width / 2 - 110;
      const left = Math.max(8, Math.min(window.innerWidth - 228, rawLeft));
      setPos({ top, left });
    }
    reposition();
    window.addEventListener("scroll", reposition, { passive: true });
    document.addEventListener("selectionchange", reposition);
    return () => {
      window.removeEventListener("scroll", reposition);
      document.removeEventListener("selectionchange", reposition);
    };
  }, [range]);

  function applyFormat(command: string, value?: string) {
    // Re-anchor selection (safety): if the document selection has drifted away
    // from the range we know about, restore it before invoking execCommand.
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
    runExecCommand(command, value);
    onMutated();
  }

  function applyBold() { applyFormat("bold"); }
  function applyItalic() { applyFormat("italic"); }
  function applyUnderline() { applyFormat("underline"); }

  function applyColor(hex: string) {
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
    runExecCommand("foreColor", hex);
    setView("main");
    onMutated();
  }

  function clearColor() {
    clearColorAroundSelection(range, host);
    setView("main");
    onMutated();
  }

  // Query commands give true cross-browser toggle state.
  const activeBold = typeof document !== "undefined" && document.queryCommandState?.("bold");
  const activeItalic = typeof document !== "undefined" && document.queryCommandState?.("italic");
  const activeUnder = typeof document !== "undefined" && document.queryCommandState?.("underline");

  if (!pos) return null;
  if (typeof document === "undefined") return null;

  // Portal to document.body so that ancestor `transform` / `will-change` rules
  // (used by the `Reveal` scroll-fade-in wrapper) don't promote the toolbar's
  // containing block and break `position: fixed` viewport-relative positioning.
  return createPortal(
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
          <button data-rich-text-toolbar="true" type="button" style={activeBold ? btnActive : btn} onClick={applyBold}>B</button>
          <button data-rich-text-toolbar="true" type="button" style={{ ...(activeItalic ? btnActive : btn), fontStyle: "italic" }} onClick={applyItalic}>I</button>
          <button data-rich-text-toolbar="true" type="button" style={{ ...(activeUnder ? btnActive : btn), textDecoration: "underline" }} onClick={applyUnderline}>U</button>
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
    </div>,
    document.body,
  );
}
