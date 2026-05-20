"use client";
import { useRef, useState } from "react";
import { useMediaUpload } from "../../../_editor/useMediaUpload";
import styles from "./funnel.module.css";

type Props = {
  value: string;
  onChange: (url: string) => void;
};

/**
 * Self-contained logo picker for the PromptEditor — uploads to Vercel Blob via
 * the same client hook MediaSlot uses, OR accepts a pasted URL. Decoupled from
 * the EditorProvider draft context because PromptEditor manages its own state
 * shape (prompts.template_styles) and doesn't share the landing-page draft.
 */
export function LogoUploader({ value, onChange }: Props) {
  const { uploadFile, busy, progress, error } = useMediaUpload();
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function handleFile(f: File | undefined | null) {
    if (!f) return;
    const url = await uploadFile(f);
    if (url) onChange(url);
  }

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
