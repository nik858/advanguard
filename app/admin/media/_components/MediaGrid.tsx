"use client";
import { useEffect, useState } from "react";

type Item = { pathname: string; url: string; size: number; uploadedAt: string };

export function MediaGrid() {
  const [items, setItems] = useState<Item[] | null>(null);

  async function load() {
    const r = await fetch("/api/media");
    if (r.ok) setItems((await r.json()).items);
  }
  useEffect(() => { load(); }, []);

  async function remove(url: string) {
    if (!confirm("Supprimer ce média ? Si utilisé sur la landing, l'image sera cassée.")) return;
    await fetch("/api/media", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) });
    load();
  }

  if (!items) return <p>Chargement...</p>;
  if (!items.length) return <p>Aucun média uploadé.</p>;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
      {items.map((it) => {
        const isVideo = /\.(mp4|webm)$/i.test(it.pathname);
        return (
          <div key={it.url} style={{ border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
            <div style={{ width: "100%", height: 120, background: "#f5f5f5", marginBottom: 8, borderRadius: 6, overflow: "hidden" }}>
              {isVideo
                ? <video src={it.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
                : <img src={it.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              }
            </div>
            <div style={{ fontSize: 12, color: "#475569", marginBottom: 4 }}>{(it.size / 1024).toFixed(0)} KB · {new Date(it.uploadedAt).toLocaleDateString("fr-FR")}</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => navigator.clipboard.writeText(it.url)} style={{ flex: 1, padding: 6, background: "#1c7bfd", color: "#fff", border: 0, borderRadius: 4, fontSize: 12 }}>Copier URL</button>
              <button onClick={() => remove(it.url)} style={{ padding: 6, background: "#fee", color: "#b91c1c", border: "1px solid #fbb", borderRadius: 4, fontSize: 12 }}>Suppr.</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
