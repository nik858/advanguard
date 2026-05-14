"use client";
import { useEffect, useState } from "react";
import { useEditor } from "./EditorProvider";
import { ConfirmDialog } from "../_components/ConfirmDialog";
import { Icons } from "../_sections/_shared/Icons";

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

function formatAgo(ms: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  return `${h} h ago`;
}

export function PublishBar() {
  const { state, resetDraft, publish, togglePreview } = useEditor();
  const [status, setStatus] = useState<null | { ok: boolean; msg: string }>(null);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const diffs = countDiff(state.draft, state.baseline);

  // Re-render every 10s so "il y a Xs" stays current
  useEffect(() => {
    if (!state.lastSaveAt) return;
    const i = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(i);
  }, [state.lastSaveAt]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const cmdOrCtrl = e.metaKey || e.ctrlKey;
      if (cmdOrCtrl && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (state.dirty && !busy) onPublish();
        return;
      }
      if (cmdOrCtrl && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        togglePreview();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.dirty, busy]);

  async function onPublish() {
    setBusy(true);
    setStatus({ ok: true, msg: "Publishing…" });
    const r = await publish();
    if (!r.ok) {
      setBusy(false);
      setStatus({ ok: false, msg: r.error });
      return;
    }
    setStatus({ ok: true, msg: "Building…" });
    const sha = r.commit_sha;
    if (!sha) {
      setBusy(false);
      setStatus({ ok: true, msg: "Published" });
      return;
    }
    const deadline = Date.now() + 120_000;
    const poll = async () => {
      const res = await fetch(`/api/deploy-status?sha=${sha}`);
      if (res.ok) {
        const body = await res.json();
        if (body.state === "READY") {
          setBusy(false);
          setStatus({ ok: true, msg: "✓ Site is live" });
          setTimeout(() => setStatus(null), 5000);
          return;
        }
        if (body.state === "ERROR" || body.state === "CANCELED") {
          setBusy(false);
          setStatus({ ok: false, msg: "Build failed" });
          return;
        }
      }
      if (Date.now() > deadline) {
        setBusy(false);
        setStatus({ ok: true, msg: "Published (check Vercel)" });
        return;
      }
      setTimeout(poll, 3000);
    };
    setTimeout(poll, 3000);
  }

  function onCancelClick() {
    if (!state.dirty) return;
    setConfirmOpen(true);
  }

  function onConfirmCancel() {
    resetDraft();
    setStatus(null);
    setConfirmOpen(false);
  }

  const isPreview = state.previewMode;

  return (
    <>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(255, 255, 255, 0.92)",
          backdropFilter: "saturate(180%) blur(16px)",
          WebkitBackdropFilter: "saturate(180%) blur(16px)",
          borderBottom: "1px solid var(--adv-border, #e7e7ea)",
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontFamily: "var(--adv-font, -apple-system, system-ui, sans-serif)",
          fontSize: 13,
          color: "var(--adv-text, #18181b)",
        }}
      >
        {/* Back to admin */}
        <a
          href="/admin"
          title="Back to admin"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            textDecoration: "none",
            color: "var(--adv-text-muted, #71717a)",
            border: "1px solid var(--adv-border, #e7e7ea)",
            padding: "5px 10px",
            borderRadius: 6,
            fontSize: 13,
            fontFamily: "inherit",
          }}
        >
          ← Admin
        </a>

        {/* Status dot */}
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 500 }}>
          <span
            aria-hidden="true"
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: isPreview ? "#a1a1aa" : "#16a34a",
              boxShadow: isPreview ? "none" : "0 0 0 3px rgba(22,163,74,.15)",
            }}
          />
          {isPreview ? "Preview" : "Editing"}
        </span>

        {/* Preview toggle */}
        <button
          type="button"
          onClick={togglePreview}
          title="Toggle preview (⌘⇧P)"
          aria-pressed={isPreview}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: isPreview ? "#f5f5f7" : "transparent",
            border: "1px solid transparent",
            color: "var(--adv-text-muted, #71717a)",
            padding: "5px 10px",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 13,
            fontFamily: "inherit",
          }}
        >
          <Icons.Eye />
          {isPreview ? "Resume editing" : "Preview"}
        </button>

        {/* Diff chip */}
        {diffs > 0 && (
          <span
            style={{
              background: "#fef3c7",
              color: "#92400e",
              padding: "2px 8px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
            }}
            title={`${diffs} unpublished change${diffs > 1 ? "s" : ""}`}
          >
            {diffs} unpublished change{diffs > 1 ? "s" : ""}
          </span>
        )}

        <div style={{ flex: 1 }} />

        {/* Save status indicator */}
        {state.lastSaveAt && !state.dirty && (
          <span style={{ color: "var(--adv-text-muted, #71717a)", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }} key={tick}>
            <Icons.Check />
            Saved {formatAgo(state.lastSaveAt)}
          </span>
        )}
        {state.dirty && !state.lastSaveAt && (
          <span style={{ color: "var(--adv-text-muted, #71717a)", fontSize: 12 }}>
            Saving…
          </span>
        )}

        {/* Action status pill */}
        {status && (
          <span
            style={{
              background: status.ok ? "#dcfce7" : "#fee2e2",
              color: status.ok ? "#166534" : "#991b1b",
              padding: "4px 10px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {status.msg}
          </span>
        )}

        {/* Buttons */}
        <button
          type="button"
          onClick={onCancelClick}
          disabled={busy || !state.dirty}
          style={{
            background: "transparent",
            color: "var(--adv-text, #18181b)",
            border: "1px solid var(--adv-border, #e7e7ea)",
            padding: "6px 12px",
            borderRadius: 6,
            cursor: state.dirty ? "pointer" : "not-allowed",
            opacity: state.dirty && !busy ? 1 : 0.5,
            fontSize: 13,
            fontWeight: 500,
            fontFamily: "inherit",
          }}
        >
          Discard
        </button>
        <button
          type="button"
          onClick={onPublish}
          disabled={busy || !state.dirty}
          title="Publish (⌘S)"
          style={{
            background: "var(--adv-accent, #18181b)",
            color: "#fff",
            border: 0,
            padding: "7px 14px",
            borderRadius: 6,
            cursor: state.dirty && !busy ? "pointer" : "not-allowed",
            opacity: state.dirty && !busy ? 1 : 0.5,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "inherit",
          }}
        >
          {busy ? "Publishing…" : "Publish"}
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Discard unpublished changes?"
        description="All current changes will be lost. This action cannot be undone."
        confirmLabel="Discard all"
        cancelLabel="Keep my changes"
        destructive
        onConfirm={onConfirmCancel}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
