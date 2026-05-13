"use client";
import { useEffect, type ReactNode } from "react";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  destructive = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel, onConfirm]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="adv-confirm-title"
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "grid",
        placeItems: "center",
        zIndex: 201,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: 24,
          width: "min(92vw, 420px)",
          boxShadow: "0 16px 48px rgba(0,0,0,.12), 0 4px 12px rgba(0,0,0,.08)",
        }}
      >
        <h2 id="adv-confirm-title" style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 600 }}>{title}</h2>
        {description && <div style={{ color: "#71717a", fontSize: 14, lineHeight: 1.5 }}>{description}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 24 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: "transparent",
              border: "1px solid #d4d4d8",
              color: "#18181b",
              padding: "8px 16px",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 500,
              fontSize: 14,
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              background: destructive ? "#dc2626" : "#18181b",
              border: 0,
              color: "#fff",
              padding: "8px 16px",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
