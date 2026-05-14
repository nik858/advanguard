"use client";
import { useState } from "react";
import { UploadModal } from "./UploadModal";
import { useEditor } from "./EditorProvider";
import { useSectionPath } from "./SectionContext";
import { Icons } from "../_sections/_shared/Icons";

export function MediaSwapButton({
  path,
  accept,
  allowUrl,
}: {
  path: string;
  accept: "image" | "video";
  allowUrl?: boolean;
}) {
  const { setField, state } = useEditor();
  const fullPath = useSectionPath(path);
  const [open, setOpen] = useState(false);

  if (state.previewMode) return null;

  const current = fullPath.split(".").reduce<any>(
    (acc, k) => acc?.[k.match(/^\d+$/) ? Number(k) : k],
    state.draft,
  ) ?? "";
  const currentUrl = typeof current === "string" ? current : current?.url;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 10,
          background: "rgba(255, 255, 255, 0.96)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          color: "#18181b",
          border: "1px solid rgba(0, 0, 0, 0.08)",
          borderRadius: 999,
          padding: "6px 12px",
          fontSize: 12,
          fontWeight: 500,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
          fontFamily: "var(--adv-font, system-ui, sans-serif)",
        }}
        aria-label="Change media"
      >
        <Icons.Pencil />
        Change
      </button>
      {open && (
        <UploadModal
          accept={accept}
          allowUrl={allowUrl}
          initialUrl={currentUrl}
          onClose={() => setOpen(false)}
          onSelect={(url) => {
            if (typeof current === "object" && current !== null) setField(fullPath, { ...current, url });
            else setField(fullPath, url);
          }}
        />
      )}
    </>
  );
}
