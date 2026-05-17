"use client";
import { useMemo, useState } from "react";
import styles from "../leads.module.css";
import { StatusBadge } from "./StatusBadge";
import { LeadDetailDrawer } from "./LeadDetailDrawer";
import { NewLeadDialog } from "./NewLeadDialog";
import type { Lead, LeadStatus } from "@/lib/db/schema";
import { CLINIC_TYPE_LABELS, type ClinicType } from "@/lib/leads/clinic-types";

const STATUS_FILTERS: Array<{ key: "all" | LeadStatus; label: string }> = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "client", label: "Client" },
  { key: "lost", label: "Lost" },
];

function timeAgo(date: Date | string): string {
  const ts = new Date(date).getTime();
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function LeadsTable({ initialRows }: { initialRows: Lead[] }) {
  const [rows, setRows] = useState<Lead[]>(initialRows);
  const [filter, setFilter] = useState<"all" | LeadStatus>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const selected = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (q && !`${r.email} ${r.firstName ?? ""} ${r.domain ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, filter, query]);

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <div className={styles.segmented} role="tablist">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                role="tab"
                data-active={filter === f.key}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <input
            type="search"
            placeholder="Search email or domain"
            className={styles.searchInput}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href="/api/admin/leads/export" download className={`${styles.btn} ${styles.btnGhost}`}>Export CSV</a>
          <button type="button" className={styles.btn} onClick={() => setShowNewDialog(true)}>
            + New lead
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className={styles.empty}>No leads match your filter. The next inbound submission will appear here.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Domain</th>
                <th>Clinic</th>
                <th>Status</th>
                <th>Source</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  data-selected={r.id === selectedId}
                  onClick={() => setSelectedId(r.id)}
                >
                  <td className={styles.cellEmail}>{r.email}</td>
                  <td>{r.firstName ?? <span className={styles.cellMuted}>—</span>}</td>
                  <td className={styles.cellMuted}>{r.domain ?? "—"}</td>
                  <td className={styles.cellMuted}>
                    {r.clinicType ? CLINIC_TYPE_LABELS[r.clinicType as ClinicType] : "—"}
                  </td>
                  <td><StatusBadge status={r.status as LeadStatus} /></td>
                  <td><span className={styles.sourcePill}>{r.source}</span></td>
                  <td className={styles.cellTime}>{timeAgo(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNewDialog && (
        <NewLeadDialog
          onClose={() => setShowNewDialog(false)}
          onCreated={(row) => setRows((prev) => [row, ...prev])}
        />
      )}

      <LeadDetailDrawer
        lead={selected}
        onClose={() => setSelectedId(null)}
        onUpdate={(updated) => setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))}
        onDelete={(id) => setRows((prev) => prev.filter((r) => r.id !== id))}
      />
    </div>
  );
}
