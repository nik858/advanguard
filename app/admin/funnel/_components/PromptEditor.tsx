"use client";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "../../../_components/Toast";
import { ConfirmDialog } from "../../../_components/ConfirmDialog";
import styles from "./funnel.module.css";

type Prompts = {
  version: number;
  system_prompt: string;
  email_instructions: string;
  subject_instructions: string;
  tone: string;
  signature: string;
};

type FieldKey = keyof Omit<Prompts, "version">;
type Field = { key: FieldKey; label: string; hint: string; rows: number };
type Group = { id: string; label: string; title: string; fields: Field[] };

const GROUPS: Group[] = [
  {
    id: "identity",
    label: "01",
    title: "Identity & instructions",
    fields: [
      { key: "system_prompt", label: "System prompt", hint: "Who Claude is and how it should think about the audit.", rows: 5 },
      { key: "email_instructions", label: "Email body instructions", hint: "How the email body should be structured and written.", rows: 5 },
      { key: "subject_instructions", label: "Subject line instructions", hint: "How the subject line should be written.", rows: 3 },
    ],
  },
  {
    id: "voice",
    label: "02",
    title: "Voice",
    fields: [
      { key: "tone", label: "Tone", hint: "The voice of the email.", rows: 2 },
      { key: "signature", label: "Signature", hint: "How the email signs off.", rows: 1 },
    ],
  },
];

type PreviewResult = {
  outcome: "success" | "fallback";
  reason: string | null;
  signals: unknown | null;
  email: { subject: string; body: string };
};

type Tab = "prompts" | "preview";

export function PromptEditor() {
  const { toast } = useToast();
  const [prompts, setPrompts] = useState<Prompts | null>(null);
  const [baseline, setBaseline] = useState<Prompts | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [previewEmail, setPreviewEmail] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [signalsOpen, setSignalsOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("prompts");

  useEffect(() => {
    fetch("/api/prompts")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((b) => {
        setPrompts(b.prompts);
        setBaseline(b.prompts);
      })
      .catch(() => toast("error", "Could not load the prompts"));
  }, [toast]);

  const dirty = useMemo(() => {
    if (!prompts || !baseline) return false;
    return JSON.stringify(prompts) !== JSON.stringify(baseline);
  }, [prompts, baseline]);

  async function save(next: Prompts) {
    setSaving(true);
    const res = await fetch("/api/prompts", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(next),
    });
    setSaving(false);
    if (res.ok) {
      setBaseline(next);
      toast("success", "Prompts saved — the next audit will use them");
    } else {
      toast("error", "Could not save the prompts");
    }
  }

  async function resetToDefault() {
    setConfirmReset(false);
    const res = await fetch("/api/prompts", { method: "DELETE" });
    if (res.ok) {
      const b = await res.json();
      setPrompts(b.prompts);
      setBaseline(b.prompts);
      toast("success", "Reset to the default prompts");
    } else {
      toast("error", "Could not reset the prompts");
    }
  }

  async function runPreview() {
    if (!prompts) return;
    setPreviewing(true);
    setPreviewResult(null);
    setSignalsOpen(false);
    try {
      const res = await fetch("/api/audit/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: previewEmail, prompts }),
      });
      if (!res.ok) {
        toast("error", "Could not run the preview");
        return;
      }
      const b = (await res.json()) as PreviewResult;
      setPreviewResult(b);
    } catch {
      toast("error", "Could not run the preview");
    } finally {
      setPreviewing(false);
    }
  }

  if (!prompts) return <p style={{ color: "#71717a" }}>Loading…</p>;

  return (
    <div>
      {/* Tabs */}
      <div className={styles.tabs}>
        <div className={styles.tabsTrack} data-active={tab}>
          <div className={styles.tabsIndicator} aria-hidden="true" />
          <button
            type="button"
            className={styles.tabBtn}
            data-active={tab === "prompts"}
            onClick={() => setTab("prompts")}
          >
            Edit prompts
          </button>
          <button
            type="button"
            className={styles.tabBtn}
            data-active={tab === "preview"}
            onClick={() => setTab("preview")}
          >
            Preview
          </button>
        </div>
        <span className={styles.tabStatus} data-dirty={dirty}>
          <span className={styles.tabStatusDot} aria-hidden="true" />
          {dirty ? "Unsaved changes" : "All changes saved"}
        </span>
      </div>

      {/* Panels — key={tab} re-mounts and replays the fade-in keyframe on switch */}
      <div key={tab} className={styles.panel}>
        {tab === "prompts" ? (
          <PromptsPanel
            prompts={prompts}
            setPrompts={setPrompts}
            saving={saving}
            dirty={dirty}
            onSave={() => save(prompts)}
            onReset={() => setConfirmReset(true)}
          />
        ) : (
          <PreviewPanel
            email={previewEmail}
            setEmail={setPreviewEmail}
            previewing={previewing}
            result={previewResult}
            signalsOpen={signalsOpen}
            setSignalsOpen={setSignalsOpen}
            onRun={runPreview}
          />
        )}
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

function PromptsPanel({
  prompts,
  setPrompts,
  saving,
  dirty,
  onSave,
  onReset,
}: {
  prompts: Prompts;
  setPrompts: (p: Prompts) => void;
  saving: boolean;
  dirty: boolean;
  onSave: () => void;
  onReset: () => void;
}) {
  return (
    <>
      <div className={styles.groups}>
        {GROUPS.map((g) => (
          <section key={g.id} className={styles.group}>
            <div className={styles.groupHead}>
              <div className={styles.groupLabel}>{g.label}</div>
              <div className={styles.groupTitle}>{g.title}</div>
            </div>
            {g.fields.map((f) => (
              <div key={f.key} className={styles.field}>
                <div className={styles.fieldHead}>
                  <label htmlFor={`f-${f.key}`} className={styles.fieldLabel}>
                    {f.label}
                  </label>
                </div>
                <div className={styles.fieldHint}>{f.hint}</div>
                <textarea
                  id={`f-${f.key}`}
                  className={styles.textarea}
                  value={prompts[f.key]}
                  rows={f.rows}
                  onChange={(e) => setPrompts({ ...prompts, [f.key]: e.target.value })}
                />
              </div>
            ))}
          </section>
        ))}
      </div>

      <div className={styles.actionBar}>
        <span className={styles.actionBarMessage}>
          {dirty ? "You have unsaved changes." : "All changes saved."}
        </span>
        <button type="button" onClick={onReset} className={styles.btnGhost}>
          Reset to default
        </button>
        <button type="button" onClick={onSave} disabled={saving || !dirty} className={styles.btnPrimary}>
          {saving ? "Saving…" : "Save prompts"}
        </button>
      </div>
    </>
  );
}

function PreviewPanel({
  email,
  setEmail,
  previewing,
  result,
  signalsOpen,
  setSignalsOpen,
  onRun,
}: {
  email: string;
  setEmail: (s: string) => void;
  previewing: boolean;
  result: PreviewResult | null;
  signalsOpen: boolean;
  setSignalsOpen: (b: boolean) => void;
  onRun: () => void;
}) {
  const signalsJson = result?.signals != null ? JSON.stringify(result.signals, null, 2) : "";
  return (
    <>
      <div className={styles.previewRunner}>
        <div className={styles.previewHead}>
          <div className={styles.previewTitle}>Test an email</div>
          <div className={styles.previewSub}>
            Runs the real audit pipeline against this email using the prompts currently in the
            editor. Nothing is sent — no webhook, no email.
          </div>
        </div>
        <div className={styles.previewRow}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="owner@clinic.com"
            className={styles.input}
          />
          <button
            type="button"
            onClick={onRun}
            disabled={previewing || !email}
            className={styles.btnPrimary}
          >
            {previewing ? "Running…" : "Run preview"}
          </button>
        </div>
        {previewing && (
          <span className={styles.previewRunning}>
            <span className={styles.previewRunningDot} aria-hidden="true" />
            Running the real audit — this takes up to a minute…
          </span>
        )}
      </div>

      {result && (
        <div className={styles.previewResults}>
          {result.outcome === "fallback" && (
            <div className={styles.fallbackBanner}>
              The pipeline fell back ({result.reason ?? "unknown reason"}) — here is the fallback
              email that would be sent.
            </div>
          )}
          <article className={styles.emailCard}>
            <header className={styles.emailCardHead}>
              <div className={styles.emailEyebrow}>Generated email</div>
              <div className={styles.emailSubject}>{result.email.subject}</div>
            </header>
            <pre className={styles.emailBody}>{result.email.body}</pre>
          </article>
          {result.signals != null && (
            <div className={styles.signalsCard}>
              <button
                type="button"
                className={styles.signalsToggle}
                onClick={() => setSignalsOpen(!signalsOpen)}
                aria-expanded={signalsOpen}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                  <span className={styles.signalsChevron} data-open={signalsOpen} aria-hidden="true">
                    ›
                  </span>
                  Extracted signals
                </span>
                <span className={styles.signalsCount}>
                  {signalsJson ? `${signalsJson.split("\n").length} lines` : ""}
                </span>
              </button>
              {signalsOpen && <pre className={styles.signalsBody}>{signalsJson}</pre>}
            </div>
          )}
        </div>
      )}
    </>
  );
}
