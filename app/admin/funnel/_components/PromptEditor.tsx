"use client";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "../../../_components/Toast";
import { ConfirmDialog } from "../../../_components/ConfirmDialog";
import styles from "./funnel.module.css";
import { renderHtmlTemplate, SAMPLE_TEMPLATE_VARS, FONT_LABELS } from "@/lib/audit/template";
import type { TemplateFontFamily, TemplateStyles } from "@/types/prompts";

const FONT_OPTIONS: TemplateFontFamily[] = ["system", "serif", "modern", "humanist"];

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
  template_styles: TemplateStyles;
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
  const [advancedOpen, setAdvancedOpen] = useState(false);
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
      styles: prompts.template_styles,
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
      toast("success", "Saved — your next audit uses these settings");
    } else {
      toast("error", "Could not save");
    }
  }

  async function resetToDefault() {
    setConfirmReset(false);
    const res = await fetch("/api/prompts", { method: "DELETE" });
    if (res.ok) {
      const b = await res.json();
      setPrompts(b.prompts);
      setBaseline(b.prompts);
      toast("success", "Reset to defaults");
    } else {
      toast("error", "Could not reset");
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

  function updateStyles(patch: Partial<TemplateStyles>) {
    if (!prompts) return;
    setPrompts({ ...prompts, template_styles: { ...prompts.template_styles, ...patch } });
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
  const t = prompts.template_styles;

  return (
    <div className={styles.editorRoot}>
      {/* ───── 1. VISUAL STYLE ───── */}
      <section className={styles.group}>
        <div className={styles.groupHead}>
          <div className={styles.groupLabel}>Step 01 · Style</div>
          <div className={styles.groupTitle}>How every email looks</div>
          <div className={styles.fieldHint} style={{ marginTop: 6 }}>
            These visual settings apply to every mail in the sequence. Live preview on the right updates as you change them.
          </div>
        </div>

        <div className={styles.styleSplit}>
          <div className={styles.styleForm}>
            <div className={styles.colorRow}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Accent color</label>
                <div className={styles.colorInputRow}>
                  <input
                    type="color"
                    className={styles.colorPicker}
                    value={t.accent_color}
                    onChange={(e) => updateStyles({ accent_color: e.target.value })}
                  />
                  <input
                    type="text"
                    className={styles.colorHex}
                    value={t.accent_color}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (/^#[0-9a-fA-F]{6}$/.test(v)) updateStyles({ accent_color: v });
                      else updateStyles({ accent_color: v });
                    }}
                    placeholder="#18181b"
                    maxLength={7}
                  />
                </div>
                <div className={styles.fieldHint}>Used for links and the divider above the signature.</div>
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Background</label>
                <div className={styles.colorInputRow}>
                  <input
                    type="color"
                    className={styles.colorPicker}
                    value={t.background_color}
                    onChange={(e) => updateStyles({ background_color: e.target.value })}
                  />
                  <input
                    type="text"
                    className={styles.colorHex}
                    value={t.background_color}
                    onChange={(e) => updateStyles({ background_color: e.target.value })}
                    placeholder="#f5f5f5"
                    maxLength={7}
                  />
                </div>
                <div className={styles.fieldHint}>Color around the email card.</div>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel}>Font family</label>
              <select
                className={styles.input}
                value={t.font_family}
                onChange={(e) => updateStyles({ font_family: e.target.value as TemplateFontFamily })}
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f} value={f}>{FONT_LABELS[f]}</option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel}>Container width — {t.container_width}px</label>
              <input
                type="range"
                min={360}
                max={720}
                step={20}
                value={t.container_width}
                className={styles.rangeInput}
                onChange={(e) => updateStyles({ container_width: Number(e.target.value) })}
              />
              <div className={styles.rangeMarks}>
                <span>Narrow</span><span>Wide</span>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel}>Header logo URL (optional)</label>
              <input
                type="url"
                className={styles.input}
                value={t.header_logo_url}
                onChange={(e) => updateStyles({ header_logo_url: e.target.value })}
                placeholder="https://your-domain.com/logo.png"
              />
              <div className={styles.fieldHint}>Paste an image URL. Shown above the body in every email.</div>
            </div>

            <button
              type="button"
              className={styles.advancedToggle}
              onClick={() => setAdvancedOpen((o) => !o)}
              aria-expanded={advancedOpen}
            >
              <span className={styles.advancedChevron} data-open={advancedOpen}>›</span>
              {advancedOpen ? "Hide" : "Show"} raw HTML
              <span className={styles.advancedNote}>For developers only</span>
            </button>

            {advancedOpen && (
              <div className={styles.advancedPanel}>
                <div className={styles.fieldHint} style={{ marginBottom: 8 }}>
                  Available placeholders:{" "}
                  <code>{"{{body_html}}"}</code>{" "}
                  <code>{"{{subject}}"}</code>{" "}
                  <code>{"{{first_name}}"}</code>{" "}
                  <code>{"{{signature}}"}</code>{" "}
                  <code>{"{{domain}}"}</code>{" "}
                  <code>{"{{accent_color}}"}</code>{" "}
                  <code>{"{{background_color}}"}</code>{" "}
                  <code>{"{{font_family_css}}"}</code>{" "}
                  <code>{"{{container_width}}"}</code>{" "}
                  <code>{"{{header_logo_html}}"}</code>
                </div>
                <textarea
                  className={styles.templateEditor}
                  value={prompts.html_template}
                  onChange={(e) => setPrompts({ ...prompts, html_template: e.target.value })}
                  spellCheck={false}
                />
              </div>
            )}
          </div>

          <div className={styles.stylePreviewWrap}>
            <div className={styles.previewBadge}>
              <span className={styles.previewBadgeDot} />
              Live preview · sample content
            </div>
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
          <div className={styles.groupLabel}>Step 02 · Voice</div>
          <div className={styles.groupTitle}>Tone, system prompt, signature</div>
          <div className={styles.fieldHint} style={{ marginTop: 6 }}>
            Shared by every mail in the sequence. Only edit if you want to change the overall voice.
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>System prompt</label>
          <textarea
            className={styles.textarea}
            rows={5}
            value={prompts.shared.system_prompt}
            onChange={(e) => updateShared("system_prompt", e.target.value)}
          />
        </div>
        <div className={styles.rowSplit}>
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
          <div className={styles.groupLabel}>Step 03 · Sequence</div>
          <div className={styles.groupTitle}>Three mails, three angles</div>
          <div className={styles.fieldHint} style={{ marginTop: 6 }}>
            Each mail focuses on a different group of audit signals. Edit the prompts to change what Claude writes about.
          </div>
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
                {prompts.emails[key].delay_hours === 0 ? "Instant" : `+${prompts.emails[key].delay_hours}h`}
              </span>
            </button>
          ))}
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Delay (hours after the first mail)</label>
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
          <div className={styles.fieldHint}>0 = send immediately. Max 72 hours (Resend limit).</div>
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
          <div className={styles.groupLabel}>Step 04 · Test</div>
          <div className={styles.previewTitle}>Try the full pipeline on a real domain</div>
          <div className={styles.previewSub}>
            Runs the crawl + 3 Claude calls + renders all three mails. Nothing is sent — this is sandbox only.
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
                    {m.delay_hours === 0 ? "Instant" : `+${m.delay_hours}h`}
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
          <span className={styles.savedDot} data-state={saving ? "saving" : dirty ? "dirty" : "saved"} />
          {saving ? "Saving…" : dirty ? "Unsaved changes" : "All changes saved"}
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
        title="Reset everything to default?"
        description="Restores the bundled defaults for the style, system prompt, tone, signature, HTML template, and all 3 mail tabs. This cannot be undone."
        confirmLabel="Reset"
        onConfirm={resetToDefault}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}
