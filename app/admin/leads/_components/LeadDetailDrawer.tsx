"use client";
import { useEffect, useState } from "react";
import styles from "../leads.module.css";
import { StatusBadge } from "./StatusBadge";
import { LEAD_STATUSES, type Lead, type LeadStatus } from "@/lib/db/schema";
import { CLINIC_TYPES, CLINIC_TYPE_LABELS, type ClinicType } from "@/lib/leads/clinic-types";
import { InlineEditableField } from "./InlineEditableField";
import type { Enrichment } from "@/types/audit";
import type { ScheduledEmail } from "@/lib/db/leads";

type Props = {
  lead: Lead | null;
  onClose: () => void;
  onUpdate: (updated: Lead) => void;
  onDelete: (id: string) => void;
};

export function LeadDetailDrawer({ lead, onClose, onUpdate, onDelete }: Props) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && lead) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lead, onClose]);

  async function patch(body: Record<string, unknown>): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!lead) return { ok: false, error: "no lead" };
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        return { ok: false, error: b.error || "Save failed" };
      }
      const { row } = await res.json();
      onUpdate(row);
      return { ok: true };
    } catch {
      return { ok: false, error: "Network error" };
    }
  }

  async function changeStatus(status: LeadStatus) {
    setBusy(true);
    await patch({ status });
    setBusy(false);
  }

  async function stopSequence() {
    if (!lead) return;
    if (!confirm(`Stop the remaining scheduled emails for ${lead.email}?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}/stop-sequence`, { method: "POST" });
      if (res.ok) {
        const { row } = await res.json();
        if (row) onUpdate(row);
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!lead) return;
    if (!confirm(`Delete lead ${lead.email}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}`, { method: "DELETE" });
      if (res.ok) {
        onDelete(lead.id);
        onClose();
      }
    } finally {
      setBusy(false);
    }
  }

  const open = lead !== null;

  return (
    <>
      <div className={styles.scrim} data-open={open} onClick={onClose} aria-hidden="true" />
      <aside className={styles.drawer} data-open={open} aria-hidden={!open}>
        {lead && (
          <>
            <div className={styles.drawerHeader}>
              <div className={styles.drawerTitle}>
                <InlineEditableField
                  value={lead.email}
                  type="email"
                  allowEmpty={false}
                  onSave={(v) => patch({ email: v })}
                />
              </div>
              <button className={styles.drawerClose} onClick={onClose} aria-label="Close">×</button>
            </div>
            <div className={styles.drawerBody}>
              <div>
                <div className={styles.sectionTitle}>Contact</div>
                <div className={styles.kv}>
                  <div className={styles.kvKey}>Name</div>
                  <div className={styles.kvValue}>
                    <InlineEditableField
                      value={lead.firstName}
                      type="text"
                      onSave={(v) => patch({ first_name: v })}
                    />
                  </div>
                  <div className={styles.kvKey}>Phone</div>
                  <div className={styles.kvValue}>
                    <InlineEditableField
                      value={lead.phone}
                      type="tel"
                      onSave={(v) => patch({ phone: v })}
                    />
                  </div>
                  <div className={styles.kvKey}>Domain</div>
                  <div className={styles.kvValue}>
                    <InlineEditableField
                      value={lead.domain}
                      type="text"
                      onSave={(v) => patch({ domain: v })}
                    />
                  </div>
                  <div className={styles.kvKey}>Clinic</div>
                  <div className={styles.kvValue}>
                    <InlineEditableField
                      value={lead.clinicType}
                      type="select"
                      options={CLINIC_TYPES.map((v) => ({ value: v, label: CLINIC_TYPE_LABELS[v] }))}
                      onSave={(v) => patch({ clinic_type: v })}
                    />
                  </div>
                  {lead.clinicUrl && (
                    <>
                      <div className={styles.kvKey}>Clinic URL</div>
                      <div className={styles.kvValue}>
                        <a href={lead.clinicUrl} target="_blank" rel="noreferrer" style={{ color: "#1c7bfd" }}>
                          {lead.clinicUrl.replace(/^https?:\/\//, "")}
                        </a>
                        <span style={{ fontSize: 11, color: "#71717a", marginLeft: 6 }}>(typed by the buyer — audit target)</span>
                      </div>
                    </>
                  )}
                  <div className={styles.kvKey}>Source</div>
                  <div className={styles.kvValue}>
                    {lead.source}
                    {lead.stripeSessionId && (
                      <span style={{ fontSize: 11, color: "#71717a", marginLeft: 6 }}>
                        · paid $27 · Stripe {lead.stripeSessionId.slice(0, 20)}…
                      </span>
                    )}
                  </div>
                  <div className={styles.kvKey}>Created</div>
                  <div className={styles.kvValue}>{new Date(lead.createdAt).toLocaleString()}</div>
                </div>
              </div>

              {(() => {
                const enr = lead.enrichment as Enrichment | null | undefined;
                if (!enr || typeof enr !== "object" || Object.keys(enr).length === 0) return null;
                const rows: Array<[string, React.ReactNode]> = [];
                if (enr.businessName) rows.push(["Business", enr.businessName]);
                if (enr.phone) rows.push(["Phone (site)", enr.phone]);
                if (enr.address) rows.push(["Address", enr.address]);
                if (enr.instagram) rows.push(["Instagram", <a key="ig" href={enr.instagram} target="_blank" rel="noreferrer" style={{ color: "#1c7bfd" }}>{enr.instagram.replace(/^https?:\/\//, "")}</a>]);
                if (enr.facebook) rows.push(["Facebook", <a key="fb" href={enr.facebook} target="_blank" rel="noreferrer" style={{ color: "#1c7bfd" }}>{enr.facebook.replace(/^https?:\/\//, "")}</a>]);
                if (enr.bookingUrl) rows.push(["Booking URL", <a key="bk" href={enr.bookingUrl} target="_blank" rel="noreferrer" style={{ color: "#1c7bfd" }}>{enr.bookingUrl}</a>]);
                if (rows.length === 0) return null;
                return (
                  <div>
                    <div className={styles.sectionTitle}>
                      ✨ Enrichment <span style={{ fontSize: 11, color: "#71717a", fontWeight: 400 }}>(auto-detected from website)</span>
                    </div>
                    <div className={styles.kv}>
                      {rows.flatMap(([k, v], i) => [
                        <div key={`k${i}`} className={styles.kvKey}>{k}</div>,
                        <div key={`v${i}`} className={styles.kvValue}>{v}</div>,
                      ])}
                    </div>
                  </div>
                );
              })()}

              <div>
                <div className={styles.sectionTitle}>Status</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <StatusBadge status={lead.status as LeadStatus} />
                  <select
                    className={styles.statusSelect}
                    value={lead.status}
                    onChange={(e) => changeStatus(e.target.value as LeadStatus)}
                    disabled={busy}
                  >
                    {LEAD_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className={styles.sectionTitle}>Audit email</div>
                {lead.auditOutcome === null && lead.source === "manual" && (
                  <div className={styles.muted}>Manual entry — no audit was generated.</div>
                )}
                {lead.auditOutcome === null && lead.source === "inbound" && (
                  <div className={styles.muted}>Audit pending — the AI pipeline hasn&apos;t finished yet. Refresh in a few seconds.</div>
                )}
                {lead.auditOutcome !== null && (
                  <>
                    <div style={{ marginBottom: 8, fontSize: 13 }}>
                      <strong>Subject:</strong> {lead.auditSubject}
                    </div>
                    <pre className={styles.preWrap}>{lead.auditBody}</pre>
                    {lead.auditOutcome === "fallback" && lead.auditReason && (
                      <div className={styles.muted} style={{ marginTop: 8 }}>
                        Fallback reason: {lead.auditReason}
                      </div>
                    )}
                  </>
                )}
              </div>

              {(() => {
                const scheduled = (lead.scheduledEmails ?? null) as ScheduledEmail[] | null;
                if (!scheduled || scheduled.length === 0) return null;
                const stopped = !!lead.sequenceStopped;
                const remaining = scheduled.filter((e) => e.status === "scheduled").length;
                return (
                  <div>
                    <div className={styles.sectionTitle} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                      <span>Mail sequence</span>
                      {!stopped && remaining > 0 && (
                        <button
                          onClick={stopSequence}
                          disabled={busy}
                          style={{
                            border: "1px solid #e7e7ea",
                            background: "#fff",
                            color: "#dc2626",
                            padding: "4px 10px",
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 500,
                            cursor: busy ? "not-allowed" : "pointer",
                          }}
                        >
                          Stop sequence
                        </button>
                      )}
                      {stopped && (
                        <span style={{ color: "#71717a", fontSize: 11, fontWeight: 400 }}>Stopped</span>
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                      {scheduled.map((entry) => {
                        const when = new Date(entry.scheduled_for);
                        const color = entry.status === "sent" ? "#16a34a"
                          : entry.status === "scheduled" ? "#2563eb"
                          : entry.status === "cancelled" ? "#71717a"
                          : "#dc2626";
                        return (
                          <div key={entry.tab} style={{ display: "grid", gridTemplateColumns: "60px 80px 1fr", gap: 8, alignItems: "center" }}>
                            <strong style={{ color: "#18181b" }}>Mail {entry.tab}</strong>
                            <span style={{ color, fontWeight: 500, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>{entry.status}</span>
                            <span style={{ color: "#71717a" }}>{when.toLocaleString()}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {lead.signals !== null && (
                <details>
                  <summary className={styles.sectionTitle} style={{ cursor: "pointer" }}>View raw signals</summary>
                  <pre className={styles.preWrap} style={{ marginTop: 8 }}>{JSON.stringify(lead.signals, null, 2)}</pre>
                </details>
              )}

              <button className={styles.dangerBtn} onClick={remove} disabled={busy}>
                Delete lead
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
