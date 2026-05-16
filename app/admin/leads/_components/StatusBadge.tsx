import styles from "../leads.module.css";
import type { LeadStatus } from "@/lib/db/schema";

const LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  client: "Client",
  lost: "Lost",
};

const VARIANT_CLASS: Record<LeadStatus, string> = {
  new: styles.badgeNew,
  contacted: styles.badgeContacted,
  client: styles.badgeClient,
  lost: styles.badgeLost,
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return <span className={`${styles.badge} ${VARIANT_CLASS[status]}`}>{LABELS[status]}</span>;
}
