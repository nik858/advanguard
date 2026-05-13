"use client";
import { useEffect, useState } from "react";
import { useToast } from "../../../_components/Toast";
import { ConfirmDialog } from "../../../_components/ConfirmDialog";
import { Icons } from "../../../_sections/_shared/Icons";

type Item = { pathname: string; url: string; size: number; uploadedAt: string };

export function MediaGrid() {
  const { toast } = useToast();
  const [items, setItems] = useState<Item[] | null>(null);
  const [confirming, setConfirming] = useState<Item | null>(null);

  async function load() {
    const r = await fetch("/api/media");
    if (r.ok) setItems((await r.json()).items);
  }
  useEffect(() => { load(); }, []);

  async function doRemove() {
    if (!confirming) return;
    const url = confirming.url;
    setConfirming(null);
    const r = await fetch("/api/media", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) });
    if (r.ok) {
      toast("success", "Média supprimé");
      load();
    } else {
      toast("error", "Impossible de supprimer ce média");
    }
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast("success", "URL copiée");
    } catch {
      toast("error", "Impossible de copier l'URL");
    }
  }

  if (!items) return <p style={{ color: "#71717a" }}>Chargement…</p>;
  if (!items.length) return <p style={{ color: "#71717a" }}>Aucun média uploadé. Les fichiers que tu ajoutes depuis l&apos;éditeur de la landing apparaîtront ici.</p>;

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
        {items.map((it) => {
          const isVideo = /\.(mp4|webm)$/i.test(it.pathname);
          return (
            <div
              key={it.url}
              style={{
                background: "#fff",
                border: "1px solid #e7e7ea",
                borderRadius: 12,
                padding: 12,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: "100%",
                  aspectRatio: "16 / 10",
                  background: "#f5f5f7",
                  borderRadius: 8,
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isVideo
                  ? <video src={it.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
                  : <img src={it.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                }
              </div>
              <div style={{ fontSize: 12, color: "#71717a" }}>
                {(it.size / 1024).toFixed(0)} KB · {new Date(it.uploadedAt).toLocaleDateString("fr-FR")}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => copy(it.url)}
                  style={{
                    flex: 1,
                    padding: "7px 10px",
                    background: "#18181b",
                    color: "#fff",
                    border: 0,
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Copier URL
                </button>
                <button
                  onClick={() => setConfirming(it)}
                  aria-label="Supprimer ce média"
                  style={{
                    padding: "7px 10px",
                    background: "#fff",
                    color: "#dc2626",
                    border: "1px solid #fecaca",
                    borderRadius: 6,
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Icons.Close />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!confirming}
        title="Supprimer ce média ?"
        description={confirming ? <span>Si ce fichier est utilisé sur la landing, l&apos;image cassera. Cette action est irréversible.</span> : null}
        confirmLabel="Supprimer"
        cancelLabel="Garder"
        destructive
        onConfirm={doRemove}
        onCancel={() => setConfirming(null)}
      />
    </>
  );
}
