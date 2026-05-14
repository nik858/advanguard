"use client";
import { useEditor } from "./EditorProvider";
import { useSectionPath } from "./SectionContext";

/** Per-card switch between a text testimonial and a video testimonial.
 *  Shared fields (name / role / quote) are preserved across the conversion;
 *  type-specific fields fall back to empty defaults. */
export function TestimonialTypeToggle({ path, current }: { path: string; current: "text" | "video" }) {
  const { setField, state } = useEditor();
  const fullPath = useSectionPath(path);
  if (state.previewMode) return null;

  function resolve(): Record<string, unknown> {
    const v = fullPath.split(".").reduce<unknown>(
      (acc, k) => (acc as Record<string, unknown> | undefined)?.[/^\d+$/.test(k) ? Number(k) : k],
      state.draft as unknown,
    );
    return (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  }
  function setType(next: "text" | "video") {
    if (next === current) return;
    const p = resolve();
    const name = typeof p.name === "string" ? p.name : "Name";
    const role = typeof p.role === "string" ? p.role : "Role";
    const quote = typeof p.quote === "string" ? p.quote : "";
    if (next === "video") {
      setField(fullPath, {
        type: "video",
        videoUrl: typeof p.videoUrl === "string" ? p.videoUrl : "",
        videoPoster: p.videoPoster ?? "",
        name, role, quote,
      });
    } else {
      setField(fullPath, {
        type: "text",
        avatar: p.avatar ?? "",
        name, role, quote,
        highlights: Array.isArray(p.highlights) ? p.highlights : [],
      });
    }
  }

  const base: React.CSSProperties = {
    border: 0,
    background: "transparent",
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 600,
    fontFamily: "var(--adv-font, system-ui, sans-serif)",
    padding: "3px 9px",
    borderRadius: 999,
    lineHeight: 1.4,
  };
  const active: React.CSSProperties = { background: "#1c7bfd", color: "#fff" };
  const idle: React.CSSProperties = { color: "#71717a" };

  return (
    <div
      style={{
        position: "absolute",
        top: -12,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 7,
        display: "inline-flex",
        gap: 2,
        padding: 2,
        background: "#fff",
        border: "1px solid var(--adv-border, #e7e7ea)",
        borderRadius: 999,
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      }}
    >
      <button type="button" style={{ ...base, ...(current === "text" ? active : idle) }} onClick={() => setType("text")}>
        Text
      </button>
      <button type="button" style={{ ...base, ...(current === "video" ? active : idle) }} onClick={() => setType("video")}>
        Video
      </button>
    </div>
  );
}
