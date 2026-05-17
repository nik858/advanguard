"use client";
import { useState } from "react";
import styles from "../leads.module.css";
import type { Lead } from "@/lib/db/schema";
import { CLINIC_TYPES, CLINIC_TYPE_LABELS, type ClinicType } from "@/lib/leads/clinic-types";

type Props = {
  onClose: () => void;
  onCreated: (row: Lead) => void;
};

export function NewLeadDialog({ onClose, onCreated }: Props) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [domain, setDomain] = useState("");
  const [clinicType, setClinicType] = useState<ClinicType | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          first_name: firstName.trim() || null,
          phone: phone.trim() || null,
          domain: domain.trim() || null,
          clinic_type: clinicType || null,
        }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setError(b.error ?? "Failed to create lead");
        return;
      }
      const { row } = await res.json();
      onCreated(row);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.dialogScrim} onClick={onClose}>
      <form className={styles.dialog} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2 className={styles.dialogTitle}>New lead</h2>

        <label className={styles.formLabel}>
          Email
          <input className={styles.formInput} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        </label>
        <label className={styles.formLabel}>
          First name
          <input className={styles.formInput} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </label>
        <label className={styles.formLabel}>
          Phone
          <input className={styles.formInput} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label className={styles.formLabel}>
          Clinic (optional)
          <select
            className={styles.formInput}
            value={clinicType}
            onChange={(e) => setClinicType(e.target.value as ClinicType | "")}
            style={{
              WebkitAppearance: "none",
              MozAppearance: "none",
              appearance: "none",
              backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%2371717a' stroke-width='1.5' d='m4 6 4 4 4-4'/%3e%3c/svg%3e\")",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 12px center",
              backgroundSize: "14px",
              paddingRight: 36,
            }}
          >
            <option value="">—</option>
            {CLINIC_TYPES.map((v) => (
              <option key={v} value={v}>{CLINIC_TYPE_LABELS[v]}</option>
            ))}
          </select>
        </label>
        <label className={styles.formLabel}>
          Domain
          <input className={styles.formInput} placeholder="brightsmile.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
        </label>

        {error && <div className={styles.formError}>{error}</div>}

        <div className={styles.dialogFooter}>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className={styles.btn} disabled={busy}>
            {busy ? "Saving…" : "Create lead"}
          </button>
        </div>
      </form>
    </div>
  );
}
