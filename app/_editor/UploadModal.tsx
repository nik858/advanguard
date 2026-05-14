"use client";
import { useState } from "react";
import { upload } from "@vercel/blob/client";

export function UploadModal({
  accept,
  allowUrl,
  initialUrl,
  onClose,
  onSelect,
}: {
  accept: "image" | "video";
  allowUrl?: boolean;
  initialUrl?: string;
  onClose: () => void;
  onSelect: (url: string) => void;
}) {
  const [tab, setTab] = useState<"file" | "url">("file");
  const [urlInput, setUrlInput] = useState(initialUrl || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await upload(`media/${Date.now()}-${f.name}`, f, {
        access: "public",
        handleUploadUrl: "/api/upload/sign",
        contentType: f.type,
      });
      onSelect(blob.url);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function onUrl() {
    if (!urlInput.trim()) return;
    onSelect(urlInput.trim());
    onClose();
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.5)",
        display: "grid",
        placeItems: "center",
        zIndex: 200,
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: "relative",
          background: "#fff",
          borderRadius: 12,
          padding: 24,
          width: "min(90vw, 480px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0 }}>Change media</h3>
        {allowUrl && (
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button
              onClick={() => setTab("file")}
              style={{
                flex: 1,
                padding: 8,
                background: tab === "file" ? "#1c7bfd" : "#eee",
                color: tab === "file" ? "#fff" : "#333",
                border: 0,
                borderRadius: 6,
              }}
            >
              File
            </button>
            <button
              onClick={() => setTab("url")}
              style={{
                flex: 1,
                padding: 8,
                background: tab === "url" ? "#1c7bfd" : "#eee",
                color: tab === "url" ? "#fff" : "#333",
                border: 0,
                borderRadius: 6,
              }}
            >
              URL (YouTube, Vimeo...)
            </button>
          </div>
        )}
        {tab === "file" ? (
          <input
            type="file"
            accept={accept === "image" ? "image/*" : "video/mp4,video/webm"}
            onChange={onFile}
            disabled={busy}
          />
        ) : (
          <div>
            <input
              type="url"
              placeholder="https://youtube.com/watch?v=..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 6 }}
            />
            <button
              onClick={onUrl}
              style={{
                marginTop: 8,
                padding: "8px 16px",
                background: "#1c7bfd",
                color: "#fff",
                border: 0,
                borderRadius: 6,
              }}
            >
              Use this URL
            </button>
          </div>
        )}
        {busy && <p style={{ fontSize: 13, color: "#666", marginTop: 12 }}>Uploading...</p>}
        {error && <p style={{ color: "#c62828", fontSize: 13, marginTop: 12 }}>{error}</p>}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: "transparent",
            border: 0,
            fontSize: 20,
            cursor: "pointer",
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
