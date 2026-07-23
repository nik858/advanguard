"use client";
import { useEffect, useRef, useState } from "react";
import { useEditor } from "./EditorProvider";
import { useSectionPath } from "./SectionContext";
import { useMediaUpload } from "./useMediaUpload";
import { MediaLibraryPopover } from "./MediaLibraryPopover";
import { Icons } from "../_sections/_shared/Icons";

type View = "menu" | "library" | "url" | "alt" | "poster";

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

export function MediaSlot({
  path,
  accept,
  compact = false,
  posterPath,
}: {
  path: string;
  accept: "image" | "video";
  /** Tiny icon-only trigger for small slots (e.g. the favicon). */
  compact?: boolean;
  /** Content path of the thumbnail image shown before a hosted video plays.
   *  Adds a "Thumbnail image" flow to the popover (videos only). */
  posterPath?: string;
}) {
  const { setField, state } = useEditor();
  const fullPath = useSectionPath(path);
  const fullPosterPath = useSectionPath(posterPath ?? path);
  const { uploadFile, busy, progress, error } = useMediaUpload();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("menu");
  const [posterMode, setPosterMode] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [altInput, setAltInput] = useState("");
  const [hovered, setHovered] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

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

  // Close the popover on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current && triggerRef.current.contains(t)) return;
      if (popoverRef.current && popoverRef.current.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (state.previewMode) return null;

  const current = fullPath.split(".").reduce<unknown>(
    (acc, k) => (acc as Record<string, unknown> | undefined)?.[k.match(/^\d+$/) ? Number(k) : (k as string)],
    state.draft as unknown,
  );
  const currentUrl = typeof current === "string"
    ? current
    : (current as { url?: string } | undefined)?.url ?? "";
  const isEmpty = !currentUrl;
  const popoverTop = compact ? 30 : 44;

  const posterCurrent = posterPath
    ? fullPosterPath.split(".").reduce<unknown>(
        (acc, k) => (acc as Record<string, unknown> | undefined)?.[k.match(/^\d+$/) ? Number(k) : (k as string)],
        state.draft as unknown,
      )
    : undefined;
  const posterUrl = typeof posterCurrent === "string"
    ? posterCurrent
    : (posterCurrent as { url?: string } | undefined)?.url ?? "";
  const effectiveAccept = posterMode ? "image" : accept;

  function applyUrl(url: string) {
    // Accept a full <iframe ...> embed snippet (e.g. Vimeo's "Embed" copy)
    // and extract its src so the user doesn't have to clean it up by hand.
    const trimmed = url.trim();
    const iframeMatch = trimmed.match(/<iframe[^>]*\bsrc=["']([^"']+)["']/i);
    const finalUrl = iframeMatch ? iframeMatch[1] : trimmed;
    if (posterMode) {
      setField(fullPosterPath, finalUrl);
    } else if (typeof current === "object" && current !== null) {
      setField(fullPath, { ...(current as object), url: finalUrl });
    } else {
      setField(fullPath, finalUrl);
    }
    setOpen(false);
    setView("menu");
    setPosterMode(false);
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

  if (isEmpty && !compact) {
    return (
      <>
        {busy && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 20,
              display: "grid",
              placeItems: "center",
              background: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              borderRadius: 8,
              color: "#18181b",
              fontFamily: "var(--adv-font, system-ui, sans-serif)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, width: "70%", maxWidth: 320 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                Uploading {accept}…{typeof progress === "number" ? ` ${Math.round(progress)}%` : ""}
              </div>
              <div style={{ width: "100%", height: 6, background: "rgba(0,0,0,0.08)", borderRadius: 999, overflow: "hidden" }}>
                <div
                  style={{
                    width: `${typeof progress === "number" ? Math.max(2, progress) : 8}%`,
                    height: "100%",
                    background: "#1c7bfd",
                    transition: "width 200ms ease-out",
                  }}
                />
              </div>
              <div style={{ fontSize: 11, color: "#71717a" }}>Don&apos;t close this tab — keep waiting until it&apos;s done.</div>
            </div>
          </div>
        )}
        <button
          ref={triggerRef}
          type="button"
          onClick={(e) => { e.stopPropagation(); setOpen(true); setView("menu"); setPosterMode(false); }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          aria-label={`Upload ${accept}`}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            minHeight: 120,
            width: "100%",
            background: dragActive ? "rgba(28,123,253,0.12)" : "rgba(28,127,255,0.04)",
            border: `2px dashed ${dragActive ? "#1c7bfd" : "rgba(28,127,255,0.5)"}`,
            borderRadius: 8,
            cursor: "pointer",
            color: "#1c7bfd",
            fontFamily: "var(--adv-font, system-ui, sans-serif)",
            fontSize: 13,
            fontWeight: 500,
            padding: 12,
            transition: "background 150ms ease-in-out, border-color 150ms ease-in-out",
          }}
        >
          <Icons.Pencil />
          <span>{dragActive ? `Drop to upload this ${accept}` : `Click or drop a${accept === "image" ? "n image" : " video"}`}</span>
        </button>

        {/* Popover */}
        {open && (
          <div
            ref={popoverRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              top: 132,
              right: compact ? 4 : 10,
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
                <button type="button" style={popBack} onClick={() => setView(posterMode ? "poster" : "menu")}>‹ Back</button>
                <MediaLibraryPopover accept={effectiveAccept} onSelect={applyUrl} />
              </div>
            )}

            {view === "url" && (
              <div>
                <button type="button" style={popBack} onClick={() => setView(posterMode ? "poster" : "menu")}>‹ Back</button>
                <input
                  type="url"
                  placeholder={accept === "video" ? "URL or <iframe …> (YouTube, Vimeo, Loom, .mp4…)" : "https://…/image.jpg"}
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
                <button type="button" style={popBack} onClick={() => setView(posterMode ? "poster" : "menu")}>‹ Back</button>
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
          accept={effectiveAccept === "image" ? "image/*" : "video/mp4,video/webm,video/quicktime"}
          style={{ display: "none" }}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </>
    );
  }

  const triggerStyle: React.CSSProperties = compact
    ? {
        position: "absolute",
        top: 4,
        right: 4,
        zIndex: 10,
        width: 22,
        height: 22,
        padding: 0,
        background: "rgba(255,255,255,0.96)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        color: "#18181b",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 999,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
        fontFamily: "var(--adv-font, system-ui, sans-serif)",
      }
    : {
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
      };

  return (
    <>
      {/* Upload progress overlay — large, unmissable while a file is uploading */}
      {busy && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 20,
            display: "grid",
            placeItems: "center",
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            borderRadius: 8,
            color: "#18181b",
            fontFamily: "var(--adv-font, system-ui, sans-serif)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, width: "70%", maxWidth: 320 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              Uploading {accept}…{typeof progress === "number" ? ` ${Math.round(progress)}%` : ""}
            </div>
            <div style={{ width: "100%", height: 6, background: "rgba(0,0,0,0.08)", borderRadius: 999, overflow: "hidden" }}>
              <div
                style={{
                  width: `${typeof progress === "number" ? Math.max(2, progress) : 8}%`,
                  height: "100%",
                  background: "#1c7bfd",
                  transition: "width 200ms ease-out",
                }}
              />
            </div>
            <div style={{ fontSize: 11, color: "#71717a" }}>Don&apos;t close this tab — keep waiting until it&apos;s done.</div>
          </div>
        </div>
      )}

      {/* Drop overlay — hover-aware; always intercepts pointer events */}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={(e) => { e.stopPropagation(); setOpen(true); setView("menu"); setPosterMode(false); }}
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
          pointerEvents: compact ? (dragActive ? "auto" : "none") : "auto",
          cursor: compact ? undefined : "pointer",
          border: dragActive ? "2px dashed #1c7bfd" : "2px dashed transparent",
          background: dragActive
            ? "rgba(28,123,253,0.12)"
            : (hovered && !compact)
              ? "rgba(0,0,0,0.4)"
              : "transparent",
          display: "grid",
          placeItems: "center",
          fontFamily: "var(--adv-font, system-ui, sans-serif)",
          fontSize: 13,
          fontWeight: 600,
          color: dragActive ? "#1c7bfd" : "#fff",
          borderRadius: 8,
          transition: "background 150ms ease-in-out",
        }}
      >
        {dragActive
          ? `Drop to replace this ${accept}`
          : hovered && !compact
            ? (
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "#fff",
                color: "#18181b",
                padding: "8px 16px",
                borderRadius: 999,
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                fontSize: 14,
                fontWeight: 600,
              }}>
                <Icons.Pencil /> Change
              </span>
            )
            : null}
      </div>

      {/* Corner button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); setView("menu"); setPosterMode(false); }}
        aria-label="Change media"
        style={triggerStyle}
      >
        <Icons.Pencil />
        {!compact && "Change"}
      </button>

      {/* Popover */}
      {open && (
        <div
          ref={popoverRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: popoverTop,
            right: compact ? 4 : 10,
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
              {accept === "video" && posterPath && (
                <button type="button" style={popItem} onClick={() => { setPosterMode(true); setView("poster"); }}>
                  Thumbnail image…
                </button>
              )}
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

          {view === "poster" && (
            <div>
              <button type="button" style={popBack} onClick={() => { setPosterMode(false); setView("menu"); }}>‹ Back</button>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <button type="button" style={popItem} onClick={() => fileRef.current?.click()}>
                  Upload an image
                </button>
                <button type="button" style={popItem} onClick={() => setView("library")}>
                  Choose from library
                </button>
                <button type="button" style={popItem} onClick={() => setView("url")}>
                  Paste a URL
                </button>
                {posterUrl && (
                  <button type="button" style={{ ...popItem, color: "#c62828" }} onClick={() => { setField(fullPosterPath, ""); setOpen(false); setPosterMode(false); }}>
                    Remove thumbnail
                  </button>
                )}
              </div>
              <p style={{ fontSize: 11, color: "#a1a1aa", margin: "6px 2px 0" }}>
                Shown over the video until the visitor presses play.
              </p>
            </div>
          )}

          {view === "library" && (
            <div>
              <button type="button" style={popBack} onClick={() => setView(posterMode ? "poster" : "menu")}>‹ Back</button>
              <MediaLibraryPopover accept={effectiveAccept} onSelect={applyUrl} />
            </div>
          )}

          {view === "url" && (
            <div>
              <button type="button" style={popBack} onClick={() => setView(posterMode ? "poster" : "menu")}>‹ Back</button>
              <input
                type="url"
                placeholder={effectiveAccept === "video" ? "URL or <iframe …> (YouTube, Vimeo, Loom, .mp4…)" : "https://…/image.jpg"}
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
              <button type="button" style={popBack} onClick={() => setView(posterMode ? "poster" : "menu")}>‹ Back</button>
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
        accept={effectiveAccept === "image" ? "image/*" : "video/mp4,video/webm,video/quicktime"}
        style={{ display: "none" }}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </>
  );
}
