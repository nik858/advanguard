import Link from "next/link";
import { Icons } from "../_sections/_shared/Icons";
import { listRecentCommits } from "@/lib/github";
import styles from "./_components/ui.module.css";

async function getLatestCommit() {
  try {
    const commits = await listRecentCommits("content/content.json", 1);
    return commits[0] || null;
  } catch {
    return null;
  }
}

function formatRelative(iso: string): string {
  const ts = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} d ago`;
  return new Date(iso).toLocaleDateString("en-US");
}

export default async function AdminHome() {
  const latest = await getLatestCommit();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 600, margin: "0 0 4px", letterSpacing: "-0.01em" }}>
          Hi Nik
        </h1>
        <p style={{ color: "#71717a", margin: 0, fontSize: 15 }}>
          What would you like to do?
        </p>
      </div>

      {/* Primary action */}
      <Link href="/" className={styles.primaryCard}>
        <div className={styles.primaryIcon}>
          <Icons.Pencil />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 3 }}>Edit the landing page</div>
          <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.6)", lineHeight: 1.45 }}>
            Inline editing — click directly on the text and media on your site.
          </div>
        </div>
        <span className={styles.primaryArrow} aria-hidden>
          &rarr;
        </span>
      </Link>

      {/* Secondary actions */}
      <div className={styles.cardGrid}>
        <Link href="/admin/funnel" className={styles.card}>
          <div className={styles.cardIcon}>
            <Icons.Sparkles />
          </div>
          <div className={styles.cardTitle}>Funnel &amp; AI Audit</div>
          <div className={styles.cardDesc}>
            The full journey: lead capture, validation, AI audit, hand-off to GoHighLevel.
          </div>
        </Link>

        <Link href="/admin/media" className={styles.card}>
          <div className={styles.cardIcon}>
            <Icons.Image />
          </div>
          <div className={styles.cardTitle}>Media library</div>
          <div className={styles.cardDesc}>
            All photos and videos uploaded from the editor.
          </div>
        </Link>

        <Link href="/admin/settings" className={styles.card}>
          <div className={styles.cardIcon}>
            <Icons.Settings />
          </div>
          <div className={styles.cardTitle}>Settings</div>
          <div className={styles.cardDesc}>
            Integration status (GitHub, GoHighLevel, storage).
          </div>
        </Link>
      </div>

      {/* Footer status */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
          color: "#a1a1aa",
          paddingTop: 4,
        }}
      >
        <span style={{ display: "inline-flex", color: "#16a34a" }}>
          <Icons.Check />
        </span>
        {latest ? (
          <span>Last published: {formatRelative(latest.date)}</span>
        ) : (
          <span>Nothing published yet</span>
        )}
      </div>
    </div>
  );
}
