"use client";
import { useEffect, useState } from "react";
import styles from "../leads.module.css";
import { StatusBadge } from "./StatusBadge";
import { LEAD_STATUSES, type Lead, type LeadStatus } from "@/lib/db/schema";
import { CLINIC_TYPE_LABELS, type ClinicType } from "@/lib/leads/clinic-types";

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

  async function changeStatus(status: LeadStatus) {
    if (!lead) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const { row } = await res.json();
        onUpdate(row);
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
              <div className={styles.drawerTitle}>{lead.email}</div>
              <button className={styles.drawerClose} onClick={onClose} aria-label="Close">×</button>
            </div>
            <div className={styles.drawerBody}>
              <div>
                <div className={styles.sectionTitle}>Contact</div>
                <div className={styles.kv}>
                  <div className={styles.kvKey}>Name</div>
                  <div className={styles.kvValue}>{lead.firstName ?? "—"}</div>
                  <div className={styles.kvKey}>Phone</div>
                  <div className={styles.kvValue}>{lead.phone ?? "—"}</div>
                  <div className={styles.kvKey}>Domain</div>
                  <div className={styles.kvValue}>{lead.domain ?? "—"}</div>
                  <div className={styles.kvKey}>Clinic</div>
                  <div className={styles.kvValue}>
                    {lead.clinicType ? CLINIC_TYPE_LABELS[lead.clinicType as ClinicType] : "—"}
                  </div>
                  <div className={styles.kvKey}>Source</div>
                  <div className={styles.kvValue}>{lead.source}</div>
                  <div className={styles.kvKey}>Created</div>
                  <div className={styles.kvValue}>{new Date(lead.createdAt).toLocaleString()}</div>
                </div>
              </div>

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
