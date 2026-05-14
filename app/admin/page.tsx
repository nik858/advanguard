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
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `il y a ${d}j`;
  return new Date(iso).toLocaleDateString("fr-FR");
}

export default async function AdminHome() {
  const latest = await getLatestCommit();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 600, margin: "0 0 4px", letterSpacing: "-0.01em" }}>
          Bonjour Nik
        </h1>
        <p style={{ color: "#71717a", margin: 0, fontSize: 15 }}>
          Que veux-tu faire aujourd&apos;hui&nbsp;?
        </p>
      </div>

      {/* Primary action */}
      <Link href="/" className={styles.primaryCard}>
        <div className={styles.primaryIcon}>
          <Icons.Pencil />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 3 }}>Modifier la landing</div>
          <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.6)", lineHeight: 1.45 }}>
            Édition en place&nbsp;: clique directement sur les textes et les médias du site.
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
          <div className={styles.cardTitle}>Tunnel &amp; Audit AI</div>
          <div className={styles.cardDesc}>
            Le parcours complet&nbsp;: capture du lead, validation, audit AI, envoi vers GoHighLevel.
          </div>
        </Link>

        <Link href="/admin/media" className={styles.card}>
          <div className={styles.cardIcon}>
            <Icons.Image />
          </div>
          <div className={styles.cardTitle}>Médiathèque</div>
          <div className={styles.cardDesc}>
            Toutes les photos et vidéos uploadées depuis l&apos;éditeur.
          </div>
        </Link>

        <Link href="/admin/settings" className={styles.card}>
          <div className={styles.cardIcon}>
            <Icons.Settings />
          </div>
          <div className={styles.cardTitle}>Réglages</div>
          <div className={styles.cardDesc}>
            État des intégrations (GitHub, GoHighLevel, stockage).
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
          <span>Dernière publication&nbsp;: {formatRelative(latest.date)}</span>
        ) : (
          <span>Aucune publication pour le moment</span>
        )}
      </div>
    </div>
  );
}
