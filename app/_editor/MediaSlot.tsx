"use client";
import { useEffect, useRef, useState } from "react";
import { useEditor } from "./EditorProvider";
import { useSectionPath } from "./SectionContext";
import { useMediaUpload } from "./useMediaUpload";
import { MediaLibraryPopover } from "./MediaLibraryPopover";
import { Icons } from "../_sections/_shared/Icons";

type View = "menu" | "library" | "url" | "alt";

const popItem: React.CSSProperties = {
  textAlign: "left",
  background: "transparent",
  border: 0,
  padding: "7px 8px",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 13,
  fontFamily: "inherit",
  color: "#18181b",
};
const popBack: React.CSSProperties = {
  background: "transparent",
  border: 0,
  padding: "2px 0 6px",
  cursor: "pointer",
  fontSize: 12,
  color: "#71717a",
  fontFamily: "inherit",
};
const popInput: React.CSSProperties = {
  width: "100%",
  padding: 8,
  border: "1px solid #e7e7ea",
  borderRadius: 6,
  fontSize: 13,
  fontFamily: "inherit",
  boxSizing: "border-box",
};
const popPrimary: React.CSSProperties = {
  marginTop: 8,
  width: "100%",
  padding: "8px 12px",
  background: "#1c7bfd",
  color: "#fff",
  border: 0,
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
  fontFamily: "inherit",
};

export function MediaSlot({ path, accept }: { path: string; accept: "image" | "video" }) {
  const { setField, state } = useEditor();
  const fullPath = useSectionPath(path);
  const { uploadFile, busy, error } = useMediaUpload();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("menu");
  const [dragActive, setDragActive] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [altInput, setAltInput] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Window-level drag detection so the overlay only intercepts pointer
  // events while a file is actually being dragged.
  useEffect(() => {
    function onEnter(e: DragEvent) {
      if (e.dataTransfer?.types?.includes("Files")) setDragActive(true);
    }
    function onLeave(e: DragEvent) {
      if (e.relatedTarget === null) setDragActive(false);
    }
    function onDrop() { setDragActive(false); }
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    window.addEventListener("dragend", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("dragend", onDrop);
    };
  }, []);

  if (state.previewMode) return null;

  const current = fullPath.split(".").reduce<unknown>(
    (acc, k) => (acc as Record<string, unknown> | undefined)?.[k.match(/^\d+$/) ? Number(k) : (k as string)],
    state.draft as unknown,
  );

  function applyUrl(url: string) {
    if (typeof current === "object" && current !== null) {
      setField(fullPath, { ...(current as object), url });
    } else {
      setField(fullPath, url);
    }
    setOpen(false);
    setView("menu");
  }

  function applyAlt(alt: string) {
    const url = typeof current === "string" ? current : (current as { url?: string } | undefined)?.url ?? "";
    setField(fullPath, { url, alt });
    setOpen(false);
    setView("menu");
  }

  async function handleFile(f: File | undefined | null) {
    if (!f) return;
    const url = await uploadFile(f);
    if (url) applyUrl(url);
  }

  return (
    <>
      {/* Drop overlay — only intercepts events while a file drag is active */}
      <div
        onDragOver={(e) => { e.preventDefault(); }}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 9,
          pointerEvents: dragActive ? "auto" : "none",
          border: dragActive ? "2px dashed #1c7bfd" : "2px dashed transparent",
          background: dragActive ? "rgba(28,123,253,0.12)" : "transparent",
          display: "grid",
          placeItems: "center",
          fontFamily: "var(--adv-font, system-ui, sans-serif)",
          fontSize: 13,
          fontWeight: 600,
          color: "#1c7bfd",
          borderRadius: 8,
        }}
      >
        {dragActive ? `Drop to replace this ${accept}` : null}
      </div>

      {/* Corner button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); setView("menu"); }}
        aria-label="Change media"
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 10,
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          color: "#18181b",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 999,
          padding: "6px 12px",
          fontSize: 12,
          fontWeight: 500,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          fontFamily: "var(--adv-font, system-ui, sans-serif)",
        }}
      >
        <Icons.Pencil />
        Change
      </button>

      {/* Popover */}
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: 44,
            right: 10,
            zIndex: 11,
            width: 280,
            background: "#fff",
            border: "1px solid var(--adv-border, #e7e7ea)",
            borderRadius: 10,
            boxShadow: "0 12px 32px rgba(0,0,0,0.16)",
            padding: 10,
            fontFamily: "var(--adv-font, system-ui, sans-serif)",
            fontSize: 13,
            color: "#18181b",
          }}
        >
          {view === "menu" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <button type="button" style={popItem} onClick={() => fileRef.current?.click()}>
                Upload a file
              </button>
              <button type="button" style={popItem} onClick={() => setView("library")}>
                Choose from library
              </button>
              <button type="button" style={popItem} onClick={() => setView("url")}>
                Paste a URL
              </button>
              {accept === "image" && (
                <button type="button" style={popItem} onClick={() => {
                  setAltInput(typeof current === "object" && current !== null ? String((current as { alt?: string }).alt ?? "") : "");
                  setView("alt");
                }}>
                  Alt text
                </button>
              )}
              <p style={{ fontSize: 11, color: "#a1a1aa", margin: "6px 2px 0" }}>
                …or drag a {accept} file straight onto it.
              </p>
            </div>
          )}

          {view === "library" && (
            <div>
              <button type="button" style={popBack} onClick={() => setView("menu")}>‹ Back</button>
              <MediaLibraryPopover accept={accept} onSelect={applyUrl} />
            </div>
          )}

          {view === "url" && (
            <div>
              <button type="button" style={popBack} onClick={() => setView("menu")}>‹ Back</button>
              <input
                type="url"
                placeholder={accept === "video" ? "https://… (YouTube, Vimeo, .mp4)" : "https://…/image.jpg"}
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                style={popInput}
              />
              <button
                type="button"
                onClick={() => { if (urlInput.trim()) applyUrl(urlInput.trim()); }}
                style={popPrimary}
              >
                Use this URL
              </button>
            </div>
          )}

          {view === "alt" && (
            <div>
              <button type="button" style={popBack} onClick={() => setView("menu")}>‹ Back</button>
              <input
                type="text"
                placeholder="Describe the image (accessibility)"
                value={altInput}
                onChange={(e) => setAltInput(e.target.value)}
                style={popInput}
              />
              <button type="button" onClick={() => applyAlt(altInput.trim())} style={popPrimary}>
                Save alt text
              </button>
            </div>
          )}

          {busy && <p style={{ fontSize: 12, color: "#71717a", marginTop: 8 }}>Uploading…</p>}
          {error && <p style={{ fontSize: 12, color: "#c62828", marginTop: 8 }}>{error}</p>}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept={accept === "image" ? "image/*" : "video/mp4,video/webm,video/quicktime"}
        style={{ display: "none" }}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </>
  );
}
