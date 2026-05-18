"use client";
import { useEffect, useRef, useState } from "react";

type Option = { value: string; label: string };

type Props = {
  value: string | null | undefined;
  type?: "text" | "email" | "tel" | "select";
  options?: Option[]; // required when type==="select"
  onSave: (value: string | null) => Promise<{ ok: true } | { ok: false; error: string }>;
  /** Display when value is null/empty */
  placeholder?: string;
  /** Allow saving an empty string as null (for nullable fields). */
  allowEmpty?: boolean;
};

export function InlineEditableField({ value, type = "text", options, onSave, placeholder = "—", allowEmpty = true }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(value ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  useEffect(() => { if (!editing) setDraft(value ?? ""); }, [value, editing]);
  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  async function commit() {
    const trimmed = draft.trim();
    // No-op if unchanged
    if (trimmed === (value ?? "")) {
      setEditing(false);
      setError(null);
      return;
    }
    if (!trimmed && !allowEmpty) {
      setError("Required");
      return;
    }
    setBusy(true);
    setError(null);
    const next = trimmed ? trimmed : null;
    const res = await onSave(next);
    setBusy(false);
    if (res.ok) {
      setEditing(false);
    } else {
      setError(res.error || "Save failed");
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); commit(); }
    if (e.key === "Escape") { e.preventDefault(); setDraft(value ?? ""); setEditing(false); setError(null); }
  }

  if (!editing) {
    const display = value && value.length > 0
      ? (type === "select" && options ? (options.find((o) => o.value === value)?.label ?? value) : value)
      : <span style={{ color: "#a1a1aa" }}>{placeholder}</span>;
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        style={{
          background: "transparent",
          border: 0,
          padding: "2px 4px",
          margin: "-2px -4px",
          textAlign: "left",
          font: "inherit",
          color: "inherit",
          cursor: "pointer",
          borderRadius: 3,
          width: "100%",
          transition: "background 100ms",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.04)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        {display}
      </button>
    );
  }

  if (type === "select") {
    return (
      <div>
        <select
          ref={inputRef as React.Ref<HTMLSelectElement>}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
          disabled={busy}
          style={{
            font: "inherit",
            padding: "2px 4px",
            margin: "-2px -4px",
            border: 0,
            borderBottom: "1px solid #1c7bfd",
            background: "rgba(28, 123, 253, 0.04)",
            outline: "none",
            width: "100%",
          }}
        >
          <option value="">{placeholder}</option>
          {options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {error && <div style={{ color: "#c62828", fontSize: 11, marginTop: 2 }}>{error}</div>}
      </div>
    );
  }

  return (
    <div>
      <input
        ref={inputRef as React.Ref<HTMLInputElement>}
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        disabled={busy}
        style={{
          font: "inherit",
          padding: "2px 4px",
          margin: "-2px -4px",
          border: 0,
          borderBottom: "1px solid #1c7bfd",
          background: "rgba(28, 123, 253, 0.04)",
          outline: "none",
          width: "100%",
        }}
      />
      {error && <div style={{ color: "#c62828", fontSize: 11, marginTop: 2 }}>{error}</div>}
    </div>
  );
}
