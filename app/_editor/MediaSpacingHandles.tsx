"use client";
import { useEffect, useRef, useState } from "react";
import { useEditor } from "./EditorProvider";
import { useSectionPath } from "./SectionContext";

// Drag handles for the space above/below an in-copy media block — same
// interaction as SectionSpacingHandles, but persisted to arbitrary numeric
// content fields (via setField) instead of the section style.
type Props = {
  mtPath: string;
  mbPath: string;
  currentMt?: number;
  currentMb?: number;
  defaultMt?: number;
  defaultMb?: number;
};

export function MediaSpacingHandles({ mtPath, mbPath, currentMt, currentMb, defaultMt = 18, defaultMb = 0 }: Props) {
  const { setField, state } = useEditor();
  const fullMtPath = useSectionPath(mtPath);
  const fullMbPath = useSectionPath(mbPath);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState<"top" | "bottom" | null>(null);
  const [draggedValue, setDraggedValue] = useState<number | null>(null);
  const startRef = useRef<{ y: number; initial: number } | null>(null);

  const mt = currentMt ?? defaultMt;
  const mb = currentMb ?? defaultMb;

  useEffect(() => {
    if (!dragging) return;
    function onMove(e: MouseEvent) {
      if (!startRef.current) return;
      const dy = e.clientY - startRef.current.y;
      // Top handle: dragging DOWN increases the space above (pushes media down)
      // Bottom handle: dragging DOWN decreases the space below (pulls next block up)
      const direction = dragging === "top" ? 1 : -1;
      const newValue = Math.max(0, Math.min(200, startRef.current.initial + dy * direction));
      const rounded = Math.round(newValue / 4) * 4;
      setDraggedValue(rounded);
      setField(dragging === "top" ? fullMtPath : fullMbPath, rounded);
    }
    function onUp() {
      setDragging(null);
      setDraggedValue(null);
      startRef.current = null;
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, fullMtPath, fullMbPath, setField]);

  if (state.previewMode) return null;

  const handleStyle: React.CSSProperties = {
    position: "absolute",
    left: 0,
    right: 0,
    height: 8,
    cursor: "ns-resize",
    background: hovered || dragging ? "rgba(28, 127, 255, 0.4)" : "transparent",
    transition: "background 120ms",
    zIndex: 50,
    display: "grid",
    placeItems: "center",
    pointerEvents: "auto",
  };

  const indicatorStyle: React.CSSProperties = {
    width: 32,
    height: 3,
    borderRadius: 2,
    background: hovered || dragging ? "#1c7bfd" : "rgba(28, 127, 255, 0.6)",
    opacity: hovered || dragging ? 1 : 0,
    transition: "opacity 120ms",
  };

  const tooltipStyle: React.CSSProperties = {
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
    background: "#18181b",
    color: "#fff",
    padding: "2px 8px",
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    fontFamily: "var(--adv-font, system-ui, sans-serif)",
    whiteSpace: "nowrap",
    pointerEvents: "none",
    zIndex: 51,
  };

  return (
    <div
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        style={{ ...handleStyle, top: -4 }}
        onMouseDown={(e) => { e.preventDefault(); setDragging("top"); startRef.current = { y: e.clientY, initial: mt }; setDraggedValue(mt); }}
      >
        <div style={indicatorStyle} />
        {dragging === "top" && draggedValue !== null && (
          <div style={{ ...tooltipStyle, top: 12 }}>{String.fromCodePoint(8597)} Space above: {draggedValue}px</div>
        )}
      </div>
      <div
        style={{ ...handleStyle, bottom: -4 }}
        onMouseDown={(e) => { e.preventDefault(); setDragging("bottom"); startRef.current = { y: e.clientY, initial: mb }; setDraggedValue(mb); }}
      >
        <div style={indicatorStyle} />
        {dragging === "bottom" && draggedValue !== null && (
          <div style={{ ...tooltipStyle, bottom: 12 }}>{String.fromCodePoint(8597)} Space below: {draggedValue}px</div>
        )}
      </div>
    </div>
  );
}
