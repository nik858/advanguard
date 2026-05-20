"use client";
import { useEffect, useRef, useState } from "react";
import { useMediaUpload } from "../../../_editor/useMediaUpload";
import { MediaLibraryPopover } from "../../../_editor/MediaLibraryPopover";
import styles from "./funnel.module.css";

type Props = {
  value: string;
  onChange: (url: string) => void;
};

/**
 * Self-contained logo picker for the PromptEditor — uploads to Vercel Blob via
 * the same client hook MediaSlot uses, OR accepts a pasted URL, OR lets the
 * operator pick from the existing media library. Decoupled from the
 * EditorProvider draft context because PromptEditor manages its own state
 * shape (prompts.template_styles).
 */
export function LogoUploader({ value, onChange }: Props) {
  const { uploadFile, busy, progress, error } = useMediaUpload();
  const [dragActive, setDragActive] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const libraryRef = useRef<HTMLDivElement | null>(null);
  const libraryBtnRef = useRef<HTMLButtonElement | null>(null);

  async function handleFile(f: File | undefined | null) {
    if (!f) return;
    const url = await uploadFile(f);
    if (url) onChange(url);
  }

  // Close library popover on outside click or Escape.
  useEffect(() => {
    if (!libraryOpen) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (libraryRef.current?.contains(t)) return;
      if (libraryBtnRef.current?.contains(t)) return;
      setLibraryOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLibraryOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [libraryOpen]);

  return (
    <div className={styles.logoUploader}>
      <div className={styles.logoUploaderRow}>
        <div
          className={styles.logoPreview}
          data-empty={!value}
          data-drag={dragActive}
          onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragOver={(e) => { e.preventDefault(); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
        >
          {value ? (
            <img src={value} alt="Logo preview" />
          ) : (
            <span className={styles.logoPlaceholder}>No logo</span>
          )}
          {busy && (
            <div className={styles.logoUploadingOverlay}>
              <div className={styles.logoUploadingText}>
                Uploading{typeof progress === "number" ? ` ${Math.round(progress)}%` : "…"}
              </div>
              <div className={styles.logoUploadingBar}>
                <div
                  className={styles.logoUploadingBarFill}
                  style={{ width: `${typeof progress === "number" ? Math.max(4, progress) : 8}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className={styles.logoControls}>
          <div className={styles.logoButtonRow}>
            <button
              type="button"
              className={styles.logoBtn}
              onClick={() => fileRef.current?.click()}
              disabled={busy}
            >
              {value ? "Replace" : "Upload"}
            </button>
            <div style={{ position: "relative" }}>
              <button
                ref={libraryBtnRef}
                type="button"
                className={styles.logoBtnGhost}
                onClick={() => setLibraryOpen((o) => !o)}
                disabled={busy}
              >
                Library
              </button>
              {libraryOpen && (
                <div
                  ref={libraryRef}
                  className={styles.libraryPopover}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className={styles.libraryPopoverHead}>
                    <span>Pick a logo from the library</span>
                    <button
                      type="button"
                      className={styles.libraryClose}
                      onClick={() => setLibraryOpen(false)}
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </div>
                  <MediaLibraryPopover
                    accept="image"
                    onSelect={(url) => {
                      onChange(url);
                      setLibraryOpen(false);
                    }}
                  />
                </div>
              )}
            </div>
            {value && (
              <button
                type="button"
                className={styles.logoBtnGhost}
                onClick={() => onChange("")}
                disabled={busy}
              >
                Remove
              </button>
            )}
          </div>
          <input
            type="url"
            className={styles.input}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="…or paste an image URL"
          />
        </div>
      </div>

      {error && <div className={styles.logoUploaderError}>{error}</div>}

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
        style={{ display: "none" }}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
