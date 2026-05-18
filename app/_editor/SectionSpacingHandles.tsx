"use client";
import { useEffect, useRef, useState } from "react";
import { useEditor } from "./EditorProvider";

type Props = {
  sectionId: string;
  currentPt?: number;
  currentPb?: number;
  /** Default padding (in px) the section's CSS applies when no override is set. Used to seed the slider at the visual baseline. */
  defaultPt?: number;
  defaultPb?: number;
};

export function SectionSpacingHandles({ sectionId, currentPt, currentPb, defaultPt = 64, defaultPb = 64 }: Props) {
  const { setSectionStyle, state } = useEditor();
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState<"top" | "bottom" | null>(null);
  const [draggedValue, setDraggedValue] = useState<number | null>(null);
  const startRef = useRef<{ y: number; initial: number } | null>(null);

  // Don't render anything in preview mode.
  if (state.previewMode) return null;

  const pt = currentPt ?? defaultPt;
  const pb = currentPb ?? defaultPb;

  function onMouseDownTop(e: React.MouseEvent) {
    e.preventDefault();
    setDragging("top");
    startRef.current = { y: e.clientY, initial: pt };
    setDraggedValue(pt);
  }
  function onMouseDownBottom(e: React.MouseEvent) {
    e.preventDefault();
    setDragging("bottom");
    startRef.current = { y: e.clientY, initial: pb };
    setDraggedValue(pb);
  }

  useEffect(() => {
    if (!dragging) return;
    function onMove(e: MouseEvent) {
      if (!startRef.current) return;
      const dy = e.clientY - startRef.current.y;
      // Top handle: dragging DOWN increases top padding (push content down)
      // Bottom handle: dragging DOWN decreases bottom padding (pull content up)
      const direction = dragging === "top" ? 1 : -1;
      const newValue = Math.max(0, Math.min(400, startRef.current.initial + dy * direction));
      const rounded = Math.round(newValue / 4) * 4;
      setDraggedValue(rounded);
      if (dragging === "top") setSectionStyle(sectionId, { pt: rounded, pb: currentPb });
      else setSectionStyle(sectionId, { pt: currentPt, pb: rounded });
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
  }, [dragging, sectionId, currentPt, currentPb, setSectionStyle]);

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
      <div style={{ ...handleStyle, top: 0, pointerEvents: "auto" }} onMouseDown={onMouseDownTop}>
        <div style={indicatorStyle} />
        {dragging === "top" && draggedValue !== null && (
          <div style={{ ...tooltipStyle, top: 12 }}>{String.fromCodePoint(8597)} Top: {draggedValue}px</div>
        )}
      </div>
      <div style={{ ...handleStyle, bottom: 0, pointerEvents: "auto" }} onMouseDown={onMouseDownBottom}>
        <div style={indicatorStyle} />
        {dragging === "bottom" && draggedValue !== null && (
          <div style={{ ...tooltipStyle, bottom: 12 }}>{String.fromCodePoint(8597)} Bottom: {draggedValue}px</div>
        )}
      </div>
    </div>
  );
}
