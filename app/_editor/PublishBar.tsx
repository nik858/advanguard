"use client";
import { useState } from "react";
import { useEditor } from "./EditorProvider";

function countDiff(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (typeof a !== typeof b) return 1;
  if (Array.isArray(a) && Array.isArray(b)) {
    let n = Math.abs(a.length - b.length);
    const min = Math.min(a.length, b.length);
    for (let i = 0; i < min; i++) n += countDiff(a[i], b[i]);
    return n;
  }
  if (a && b && typeof a === "object") {
    const keys = new Set([...Object.keys(a as object), ...Object.keys(b as object)]);
    let n = 0;
    for (const k of keys) n += countDiff((a as any)[k], (b as any)[k]);
    return n;
  }
  return 1;
}

export function PublishBar() {
  const { state, resetDraft, publish } = useEditor();
  const [status, setStatus] = useState<null | { ok: boolean; msg: string }>(null);
  const [busy, setBusy] = useState(false);
  const diffs = countDiff(state.draft, state.baseline);

  async function onPublish() {
    setBusy(true); setStatus(null);
    const r = await publish();
    if (!r.ok) {
      setBusy(false);
      setStatus({ ok: false, msg: r.error });
      return;
    }
    setStatus({ ok: true, msg: "Build en cours…" });
    const sha = r.commit_sha;
    if (!sha) { setBusy(false); setStatus({ ok: true, msg: "✓ Commit publié" }); return; }
    const deadline = Date.now() + 120_000;
    const poll = async () => {
      const res = await fetch(`/api/deploy-status?sha=${sha}`);
      if (res.ok) {
        const body = await res.json();
        if (body.state === "READY") { setBusy(false); setStatus({ ok: true, msg: "✓ Site en ligne" }); return; }
        if (body.state === "ERROR" || body.state === "CANCELED") { setBusy(false); setStatus({ ok: false, msg: "Build échoué — voir Vercel" }); return; }
      }
      if (Date.now() > deadline) { setBusy(false); setStatus({ ok: true, msg: "✓ Commit publié (timeout polling)" }); return; }
      setTimeout(poll, 3000);
    };
    setTimeout(poll, 3000);
  }

  async function onCancel() {
    if (!confirm("Annuler toutes les modifications non publiées ?")) return;
    resetDraft();
    setStatus(null);
  }

  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 100,
      background: "#0f172a", color: "#fff",
      padding: "10px 16px", display: "flex", alignItems: "center", gap: 16,
      fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 14,
    }}>
      <span>🟢 Mode édition</span>
      <span style={{ opacity: 0.7 }}>•</span>
      <span><b>{diffs}</b> modif{diffs > 1 ? "s" : ""} non publiée{diffs > 1 ? "s" : ""}</span>
      <div style={{ flex: 1 }} />
      {status && <span style={{ background: status.ok ? "#15803d" : "#b91c1c", padding: "4px 10px", borderRadius: 999 }}>{status.msg}</span>}
      <button onClick={onCancel} disabled={busy || !state.dirty} style={{ background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,.3)", padding: "6px 12px", borderRadius: 6, cursor: state.dirty ? "pointer" : "not-allowed", opacity: state.dirty ? 1 : 0.5 }}>Annuler</button>
      <button onClick={onPublish} disabled={busy || !state.dirty} style={{ background: "#1c7bfd", color: "#fff", border: 0, padding: "8px 16px", borderRadius: 6, cursor: state.dirty ? "pointer" : "not-allowed", opacity: state.dirty ? 1 : 0.5, fontWeight: 600 }}>{busy ? "Publication..." : "Publier"}</button>
    </div>
  );
}
