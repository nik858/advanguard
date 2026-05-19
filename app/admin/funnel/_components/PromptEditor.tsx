"use client";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "../../../_components/Toast";
import { ConfirmDialog } from "../../../_components/ConfirmDialog";
import styles from "./funnel.module.css";
import { renderHtmlTemplate, SAMPLE_TEMPLATE_VARS } from "@/lib/audit/template";

type MailConfig = {
  delay_hours: number;
  email_instructions: string;
  subject_instructions: string;
};

type PromptsV2 = {
  version: 2;
  shared: {
    system_prompt: string;
    tone: string;
    signature: string;
  };
  html_template: string;
  emails: {
    mail_1: MailConfig;
    mail_2: MailConfig;
    mail_3: MailConfig;
  };
};

type MailKey = "mail_1" | "mail_2" | "mail_3";

type PreviewMail = {
  tab: 1 | 2 | 3;
  delay_hours: number;
  subject: string;
  body: string;
  html: string;
  fallback: boolean;
  reason?: string | null;
};

type PreviewResult = {
  outcome: "success" | "fallback";
  reason: string | null;
  signals: unknown | null;
  enrichment: unknown | null;
  mails: PreviewMail[];
};

const MAIL_KEYS: MailKey[] = ["mail_1", "mail_2", "mail_3"];
const TAB_LABELS: Record<MailKey, string> = {
  mail_1: "Mail 1",
  mail_2: "Mail 2",
  mail_3: "Mail 3",
};

export function PromptEditor() {
  const { toast } = useToast();
  const [prompts, setPrompts] = useState<PromptsV2 | null>(null);
  const [baseline, setBaseline] = useState<PromptsV2 | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [previewEmail, setPreviewEmail] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [signalsOpen, setSignalsOpen] = useState(false);
  const [activeMail, setActiveMail] = useState<MailKey>("mail_1");
  const [activePreviewMail, setActivePreviewMail] = useState<1 | 2 | 3>(1);
  const [previewMode, setPreviewMode] = useState<"rendered" | "plain">("rendered");

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

  const templatePreviewHtml = useMemo(() => {
    if (!prompts) return "";
    return renderHtmlTemplate(prompts.html_template, {
      ...SAMPLE_TEMPLATE_VARS,
      signature: prompts.shared.signature || SAMPLE_TEMPLATE_VARS.signature,
    });
  }, [prompts]);

  async function save() {
    if (!prompts) return;
    setSaving(true);
    const res = await fetch("/api/prompts", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(prompts),
    });
    setSaving(false);
    if (res.ok) {
      setBaseline(prompts);
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
      setActivePreviewMail(1);
    } catch {
      toast("error", "Could not run the preview");
    } finally {
      setPreviewing(false);
    }
  }

  function updateShared(key: keyof PromptsV2["shared"], value: string) {
    if (!prompts) return;
    setPrompts({ ...prompts, shared: { ...prompts.shared, [key]: value } });
  }

  function updateMail(key: MailKey, patch: Partial<MailConfig>) {
    if (!prompts) return;
    setPrompts({
      ...prompts,
      emails: { ...prompts.emails, [key]: { ...prompts.emails[key], ...patch } },
    });
  }

  if (!prompts) return <p style={{ color: "#71717a" }}>Loading…</p>;

  const currentMail = prompts.emails[activeMail];
  const currentPreviewMail = previewResult?.mails.find((m) => m.tab === activePreviewMail) ?? null;

  return (
    <div className={styles.editorRoot}>
      {/* ───── 1. CONFIGURATION (HTML template) ───── */}
      <section className={styles.group}>
        <div className={styles.groupHead}>
          <div className={styles.groupLabel}>Configuration</div>
          <div className={styles.groupTitle}>HTML template (used by all 3 mails)</div>
          <div className={styles.fieldHint} style={{ marginTop: 4 }}>
            Placeholders: <code>{"{{body_html}}"}</code>, <code>{"{{subject}}"}</code>,{" "}
            <code>{"{{first_name}}"}</code>, <code>{"{{signature}}"}</code>, <code>{"{{domain}}"}</code>.
          </div>
        </div>
        <div className={styles.templateSplit}>
          <textarea
            className={styles.templateEditor}
            value={prompts.html_template}
            onChange={(e) =>
              setPrompts({ ...prompts, html_template: e.target.value })
            }
            spellCheck={false}
          />
          <div className={styles.templatePreviewWrap}>
            <div className={styles.templatePreviewLabel}>Live preview (sample variables)</div>
            <iframe
              className={styles.templatePreview}
              title="HTML template preview"
              srcDoc={templatePreviewHtml}
              sandbox=""
            />
          </div>
        </div>
      </section>

      {/* ───── 2. SHARED PROMPTS ───── */}
      <section className={styles.group}>
        <div className={styles.groupHead}>
          <div className={styles.groupLabel}>Shared</div>
          <div className={styles.groupTitle}>Voice + system prompt (used by all 3 mails)</div>
        </div>
        <div className={styles.field}>
          <div className={styles.fieldHead}>
            <label className={styles.fieldLabel}>System prompt</label>
          </div>
          <textarea
            className={styles.textarea}
            rows={5}
            value={prompts.shared.system_prompt}
            onChange={(e) => updateShared("system_prompt", e.target.value)}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Tone</label>
            <input
              className={styles.input}
              value={prompts.shared.tone}
              onChange={(e) => updateShared("tone", e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Signature</label>
            <input
              className={styles.input}
              value={prompts.shared.signature}
              onChange={(e) => updateShared("signature", e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* ───── 3. MAIL TABS ───── */}
      <section className={styles.group}>
        <div className={styles.groupHead}>
          <div className={styles.groupLabel}>Sequence</div>
          <div className={styles.groupTitle}>Per-mail prompts and delays</div>
        </div>
        <div className={styles.mailTabsRow}>
          {MAIL_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className={styles.mailTab}
              data-active={activeMail === key}
              onClick={() => setActiveMail(key)}
            >
              <span>{TAB_LABELS[key]}</span>
              <span className={styles.mailTabDelay}>
                {prompts.emails[key].delay_hours === 0 ? "instant" : `+${prompts.emails[key].delay_hours}h`}
              </span>
            </button>
          ))}
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Delay (hours after T0)</label>
          <input
            type="number"
            min={0}
            max={72}
            step={1}
            className={styles.input}
            value={currentMail.delay_hours}
            onChange={(e) =>
              updateMail(activeMail, {
                delay_hours: Math.max(0, Math.min(72, Number(e.target.value) || 0)),
              })
            }
            style={{ maxWidth: 140 }}
          />
          <div className={styles.fieldHint}>Resend allows scheduled sends up to 72h ahead.</div>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Subject prompt</label>
          <textarea
            className={styles.textarea}
            rows={3}
            value={currentMail.subject_instructions}
            onChange={(e) => updateMail(activeMail, { subject_instructions: e.target.value })}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Email body prompt</label>
          <textarea
            className={styles.textarea}
            rows={8}
            value={currentMail.email_instructions}
            onChange={(e) => updateMail(activeMail, { email_instructions: e.target.value })}
          />
        </div>
      </section>

      {/* ───── 4. TEST PREVIEW ───── */}
      <section className={styles.previewRunner}>
        <div className={styles.previewHead}>
          <div className={styles.previewTitle}>🧪 Test preview</div>
          <div className={styles.previewSub}>
            Run the full pipeline (crawl + PageSpeed + 3 Claude calls) on a real domain. Nothing is sent.
          </div>
        </div>
        <div className={styles.previewRow}>
          <input
            type="email"
            placeholder="owner@theirclinic.com"
            className={styles.input}
            value={previewEmail}
            onChange={(e) => setPreviewEmail(e.target.value)}
          />
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={runPreview}
            disabled={previewing || !previewEmail || !/^\S+@\S+\.\S+$/.test(previewEmail)}
          >
            {previewing ? "Generating…" : "Run preview"}
          </button>
        </div>
        {previewing && (
          <div className={styles.previewRunning}>
            <span className={styles.previewRunningDot} />
            Generating 3 mails… this can take 20–40 seconds.
          </div>
        )}

        {previewResult && (
          <div className={styles.previewResults}>
            {previewResult.outcome === "fallback" && (
              <div className={styles.fallbackBanner}>
                Pipeline returned at least one fallback mail
                {previewResult.reason ? ` — ${previewResult.reason}` : ""}.
              </div>
            )}

            <div className={styles.mailTabsRow}>
              {previewResult.mails.map((m) => (
                <button
                  key={m.tab}
                  type="button"
                  className={styles.mailTab}
                  data-active={activePreviewMail === m.tab}
                  onClick={() => setActivePreviewMail(m.tab)}
                >
                  <span>Mail {m.tab}</span>
                  <span className={styles.mailTabDelay}>
                    {m.delay_hours === 0 ? "instant" : `+${m.delay_hours}h`}
                  </span>
                  {m.fallback && <span className={styles.mailTabFallback}>fallback</span>}
                </button>
              ))}
            </div>

            {currentPreviewMail && (
              <div className={styles.emailCard}>
                <div className={styles.emailCardHead}>
                  <div className={styles.emailEyebrow}>Subject</div>
                  <div className={styles.emailSubject}>{currentPreviewMail.subject}</div>
                </div>
                <div className={styles.previewModeRow}>
                  <button
                    type="button"
                    className={styles.previewModeBtn}
                    data-active={previewMode === "rendered"}
                    onClick={() => setPreviewMode("rendered")}
                  >
                    Rendered
                  </button>
                  <button
                    type="button"
                    className={styles.previewModeBtn}
                    data-active={previewMode === "plain"}
                    onClick={() => setPreviewMode("plain")}
                  >
                    Plain text
                  </button>
                </div>
                {previewMode === "rendered" ? (
                  <iframe
                    className={styles.emailHtmlPreview}
                    title={`Mail ${currentPreviewMail.tab} preview`}
                    srcDoc={currentPreviewMail.html}
                    sandbox=""
                  />
                ) : (
                  <pre className={styles.emailBody}>{currentPreviewMail.body}</pre>
                )}
              </div>
            )}

            {previewResult.signals !== null && (
              <div className={styles.signalsCard}>
                <button
                  type="button"
                  className={styles.signalsToggle}
                  onClick={() => setSignalsOpen((o) => !o)}
                >
                  <span>Raw signals JSON</span>
                  <span className={styles.signalsChevron} data-open={signalsOpen}>
                    ›
                  </span>
                </button>
                {signalsOpen && (
                  <pre className={styles.signalsBody}>
                    {JSON.stringify(previewResult.signals, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Sticky save bar */}
      <div className={styles.actionBar}>
        <div className={styles.actionBarMessage}>
          {dirty ? "Unsaved changes" : saving ? "Saving…" : "All changes saved"}
        </div>
        <button
          type="button"
          className={styles.btnGhost}
          onClick={() => setConfirmReset(true)}
          disabled={saving}
        >
          Reset to default
        </button>
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={save}
          disabled={saving || !dirty}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Reset all prompts and template?"
        description="This restores the bundled defaults for the system prompt, tone, signature, HTML template, and all 3 mail tabs. This cannot be undone."
        confirmLabel="Reset"
        onConfirm={resetToDefault}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}
