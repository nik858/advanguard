"use client";
import { useEffect, useState } from "react";
import { useToast } from "../../../_components/Toast";
import { ConfirmDialog } from "../../../_components/ConfirmDialog";
import { Icons } from "../../../_sections/_shared/Icons";

type Commit = { sha: string; message: string; date: string };

export function HistoryList() {
  const { toast } = useToast();
  const [commits, setCommits] = useState<Commit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingSha, setConfirmingSha] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    fetch("/api/history")
      .then((r) => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((b) => setCommits(b.commits))
      .catch((e) => setError(String(e)));
  }, []);

  async function doRestore() {
    if (!confirmingSha) return;
    setRestoring(true);
    const r = await fetch("/api/restore", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sha: confirmingSha }),
    });
    setRestoring(false);
    if (r.ok) {
      toast("success", "Version restaurée dans ton brouillon. Va sur la landing pour vérifier puis Publier.");
      setConfirmingSha(null);
    } else {
      const b = await r.json().catch(() => ({}));
      toast("error", b.error || "Restauration impossible");
      setConfirmingSha(null);
    }
  }

  if (error) return <p style={{ color: "#dc2626" }}>Erreur: {error}</p>;
  if (!commits) return <p style={{ color: "#71717a" }}>Chargement…</p>;
  if (!commits.length) return <p style={{ color: "#71717a" }}>Aucune publication encore.</p>;

  const repoUrl = process.env.NEXT_PUBLIC_GITHUB_REPO ? `https://github.com/${process.env.NEXT_PUBLIC_GITHUB_REPO}` : "";

  return (
    <>
      <div style={{ background: "#fff", border: "1px solid #e7e7ea", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#fafafa", borderBottom: "1px solid #e7e7ea" }}>
              <th align="left" style={{ padding: "10px 16px", fontSize: 12, fontWeight: 600, color: "#71717a", textTransform: "uppercase", letterSpacing: ".04em" }}>Date</th>
              <th align="left" style={{ padding: "10px 16px", fontSize: 12, fontWeight: 600, color: "#71717a", textTransform: "uppercase", letterSpacing: ".04em" }}>Modification</th>
              <th align="right" style={{ padding: "10px 16px", fontSize: 12, fontWeight: 600, color: "#71717a" }}></th>
            </tr>
          </thead>
          <tbody>
            {commits.map((c, idx) => (
              <tr key={c.sha} style={{ borderBottom: idx < commits.length - 1 ? "1px solid #f4f4f5" : "none" }}>
                <td style={{ padding: "12px 16px", color: "#71717a", fontSize: 13, whiteSpace: "nowrap" }}>{new Date(c.date).toLocaleString("fr-FR")}</td>
                <td style={{ padding: "12px 16px", color: "#27272a", fontSize: 14 }}>{c.message.split("\n")[0]}</td>
                <td style={{ padding: "12px 16px", textAlign: "right" }}>
                  <div style={{ display: "inline-flex", gap: 8 }}>
                    {repoUrl && (
                      <a href={`${repoUrl}/commit/${c.sha}`} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#71717a", fontSize: 12, textDecoration: "none" }}>
                        <Icons.ExternalLink />
                        GitHub
                      </a>
                    )}
                    <button
                      onClick={() => setConfirmingSha(c.sha)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        background: "transparent",
                        border: "1px solid #e7e7ea",
                        color: "#27272a",
                        padding: "4px 10px",
                        borderRadius: 6,
                        fontSize: 12,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      <Icons.RotateCcw />
                      Restaurer
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!confirmingSha}
        title="Restaurer cette version ?"
        description={<>Le contenu de cette version sera chargé dans ton brouillon. Tu pourras le vérifier sur la landing avant de publier. {restoring && <span style={{ display: "block", marginTop: 8, color: "#71717a" }}>Restauration en cours…</span>}</>}
        confirmLabel={restoring ? "Restauration…" : "Restaurer"}
        cancelLabel="Annuler"
        onConfirm={doRestore}
        onCancel={() => !restoring && setConfirmingSha(null)}
      />
    </>
  );
}
