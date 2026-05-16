"use client";
import { useState } from "react";
import { useEditor } from "@/app/_editor/EditorProvider";

export function PublishPill() {
  const { state, publish, resetDraft } = useEditor();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  if (!state.dirty && !status) return null;

  async function onPublish() {
    setBusy(true);
    setStatus("Publishing…");
    const r = await publish();
    setBusy(false);
    if (!r.ok) {
      setStatus(r.error || "Failed");
      return;
    }
    setStatus("✓ Published");
    setTimeout(() => setStatus(null), 3000);
  }

  function onDiscard() {
    if (!confirm("Discard unpublished changes?")) return;
    resetDraft();
    setStatus(null);
  }

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 80,
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 8px 8px 14px",
        background: "#18181b",
        color: "#fafafa",
        borderRadius: 999,
        font: "500 12px/1 var(--adv-font, system-ui)",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.18)",
        animation: "pillIn 180ms ease-out",
      }}
    >
      <span style={{ opacity: 0.8 }}>
        {status ?? `${state.dirty ? "Unsaved changes" : ""}`}
      </span>
      {state.dirty && !busy && (
        <>
          <button
            type="button"
            onClick={onDiscard}
            style={{
              background: "transparent",
              border: 0,
              color: "#a1a1aa",
              cursor: "pointer",
              font: "500 12px/1 inherit",
              padding: "4px 6px",
            }}
            title="Discard"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={onPublish}
            style={{
              background: "#fafafa",
              color: "#18181b",
              border: 0,
              borderRadius: 999,
              padding: "6px 12px",
              font: "600 12px/1 inherit",
              cursor: "pointer",
            }}
          >
            Publish
          </button>
        </>
      )}
      <style>{`
        @keyframes pillIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
