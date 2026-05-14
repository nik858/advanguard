"use client";
import { useEffect, useState } from "react";
import { useToast } from "../../../_components/Toast";
import { ConfirmDialog } from "../../../_components/ConfirmDialog";

type Prompts = {
  version: number;
  system_prompt: string;
  email_instructions: string;
  subject_instructions: string;
  tone: string;
  signature: string;
};

const FIELDS: { key: keyof Omit<Prompts, "version">; label: string; hint: string; rows: number }[] = [
  { key: "system_prompt", label: "System prompt", hint: "Who Claude is and how it should think about the audit.", rows: 5 },
  { key: "email_instructions", label: "Email body instructions", hint: "How the email body should be structured and written.", rows: 5 },
  { key: "subject_instructions", label: "Subject line instructions", hint: "How the subject line should be written.", rows: 3 },
  { key: "tone", label: "Tone", hint: "The voice of the email.", rows: 2 },
  { key: "signature", label: "Signature", hint: "How the email signs off.", rows: 1 },
];

export function PromptEditor() {
  const { toast } = useToast();
  const [prompts, setPrompts] = useState<Prompts | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    fetch("/api/prompts")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((b) => setPrompts(b.prompts))
      .catch(() => toast("error", "Could not load the prompts"));
  }, [toast]);

  async function save(next: Prompts) {
    setSaving(true);
    const res = await fetch("/api/prompts", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(next),
    });
    setSaving(false);
    if (res.ok) toast("success", "Prompts saved — the next audit will use them");
    else toast("error", "Could not save the prompts");
  }

  async function resetToDefault() {
    setConfirmReset(false);
    const res = await fetch("/api/prompts", { method: "DELETE" });
    if (res.ok) {
      const b = await res.json();
      setPrompts(b.prompts);
      toast("success", "Reset to the default prompts");
    } else {
      toast("error", "Could not reset the prompts");
    }
  }

  if (!prompts) return <p style={{ color: "#71717a" }}>Loading…</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 720 }}>
      {FIELDS.map((f) => (
        <div key={f.key}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#27272a", marginBottom: 2 }}>
            {f.label}
          </label>
          <div style={{ fontSize: 12, color: "#a1a1aa", marginBottom: 6 }}>{f.hint}</div>
          <textarea
            value={prompts[f.key]}
            rows={f.rows}
            onChange={(e) => setPrompts({ ...prompts, [f.key]: e.target.value })}
            style={{
              width: "100%", padding: "10px 12px", border: "1px solid #d4d4d8",
              borderRadius: 8, fontSize: 13, fontFamily: "var(--adv-font, system-ui)",
              resize: "vertical", boxSizing: "border-box", lineHeight: 1.5,
            }}
          />
        </div>
      ))}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => save(prompts)}
          disabled={saving}
          style={{
            background: "#18181b", color: "#fff", border: 0, padding: "9px 18px",
            borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "Saving…" : "Save prompts"}
        </button>
        <button
          onClick={() => setConfirmReset(true)}
          style={{
            background: "transparent", color: "#27272a", border: "1px solid #e7e7ea",
            padding: "9px 18px", borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: "pointer",
          }}
        >
          Reset to default
        </button>
      </div>
      <ConfirmDialog
        open={confirmReset}
        title="Reset to the default prompts?"
        description="This deletes your customized prompts and restores the built-in defaults. Any unsaved edits in the editor are also discarded."
        confirmLabel="Reset to default"
        cancelLabel="Keep my prompts"
        destructive
        onConfirm={resetToDefault}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}
