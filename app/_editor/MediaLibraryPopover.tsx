"use client";
import { useEffect, useState } from "react";

type MediaItem = { pathname: string; url: string; size: number; uploadedAt: string };

export function MediaLibraryPopover({
  accept,
  onSelect,
}: {
  accept: "image" | "video";
  onSelect: (url: string) => void;
}) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/media")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((b) => setItems(Array.isArray(b.items) ? b.items : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const exts = accept === "image"
    ? [".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg"]
    : [".mp4", ".webm", ".mov", ".m4v"];
  const filtered = items.filter((it) =>
    exts.some((e) => it.pathname.toLowerCase().endsWith(e))
  );

  if (loading) {
    return <p style={{ fontSize: 12, color: "#71717a", margin: "8px 0" }}>Loading library…</p>;
  }
  if (filtered.length === 0) {
    return <p style={{ fontSize: 12, color: "#71717a", margin: "8px 0" }}>No {accept}s in the library yet.</p>;
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 6,
        maxHeight: 220,
        overflowY: "auto",
        marginTop: 8,
      }}
    >
      {filtered.map((it) => (
        <button
          key={it.url}
          type="button"
          onClick={() => onSelect(it.url)}
          title={it.pathname}
          style={{
            border: "1px solid #e7e7ea",
            borderRadius: 6,
            padding: 0,
            overflow: "hidden",
            cursor: "pointer",
            background: "#fafafa",
            aspectRatio: "16 / 10",
          }}
        >
          {accept === "image" ? (
            <img src={it.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <video src={it.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
          )}
        </button>
      ))}
    </div>
  );
}
