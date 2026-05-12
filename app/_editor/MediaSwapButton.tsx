"use client";
import { useState } from "react";
import { UploadModal } from "./UploadModal";
import { useEditor } from "./EditorProvider";

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
  const [open, setOpen] = useState(false);
  const current = path.split(".").reduce<any>(
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
          top: 8,
          right: 8,
          zIndex: 10,
          background: "rgba(15,23,42,.85)",
          color: "#fff",
          border: 0,
          borderRadius: 999,
          padding: "6px 10px",
          fontSize: 12,
          cursor: "pointer",
        }}
        aria-label="Changer le média"
      >
        ↻ Changer
      </button>
      {open && (
        <UploadModal
          accept={accept}
          allowUrl={allowUrl}
          initialUrl={currentUrl}
          onClose={() => setOpen(false)}
          onSelect={(url) => {
            if (typeof current === "object" && current !== null) setField(path, { ...current, url });
            else setField(path, url);
          }}
        />
      )}
    </>
  );
}
