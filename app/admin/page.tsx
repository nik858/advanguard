import Link from "next/link";
import { Icons } from "../_sections/_shared/Icons";
import { listRecentCommits } from "@/lib/github";

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
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 600, margin: "0 0 6px" }}>Bienvenue, Nik</h1>
        <p style={{ color: "#71717a", margin: 0, fontSize: 15 }}>
          Édite ton site directement en cliquant sur les textes et les médias.
        </p>
      </div>

      {/* Primary CTA */}
      <Link
        href="/"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "20px 24px",
          background: "#18181b",
          color: "#fff",
          borderRadius: 12,
          textDecoration: "none",
          maxWidth: 600,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ width: 40, height: 40, borderRadius: 999, background: "rgba(255,255,255,.1)", display: "grid", placeItems: "center" }}>
          <Icons.Pencil />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 2 }}>Modifier la landing</div>
          <div style={{ fontSize: 13, opacity: 0.7 }}>Édition en place : clique sur n&apos;importe quel texte ou média</div>
        </div>
        <span style={{ fontSize: 20, opacity: 0.6 }}>→</span>
      </Link>

      {/* Secondary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, maxWidth: 900 }}>
        <Link href="/admin/history" style={{ ...cardStyle, textDecoration: "none", color: "inherit" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#71717a", marginBottom: 8 }}>
            <Icons.History />
            <span style={{ fontSize: 13, fontWeight: 500 }}>Dernière publication</span>
          </div>
          {latest ? (
            <>
              <div style={{ fontSize: 15, color: "#18181b", marginBottom: 4 }}>{formatRelative(latest.date)}</div>
              <div style={{ fontSize: 12, color: "#a1a1aa", fontFamily: "var(--adv-font-mono, monospace)" }}>{latest.message.split("\n")[0].slice(0, 60)}</div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: "#a1a1aa" }}>Aucune publication encore</div>
          )}
        </Link>

        <Link href="/admin/media" style={{ ...cardStyle, textDecoration: "none", color: "inherit" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#71717a", marginBottom: 8 }}>
            <Icons.Image />
            <span style={{ fontSize: 13, fontWeight: 500 }}>Médiathèque</span>
          </div>
          <div style={{ fontSize: 13, color: "#a1a1aa" }}>Gère les photos et vidéos uploadées</div>
        </Link>

        <Link href="/" target="_blank" rel="noreferrer" style={{ ...cardStyle, textDecoration: "none", color: "inherit" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#71717a", marginBottom: 8 }}>
            <Icons.ExternalLink />
            <span style={{ fontSize: 13, fontWeight: 500 }}>Voir le site publié</span>
          </div>
          <div style={{ fontSize: 13, color: "#a1a1aa" }}>Ouvre la landing telle que les visiteurs la voient</div>
        </Link>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  padding: 20,
  background: "#fff",
  border: "1px solid #e7e7ea",
  borderRadius: 12,
  display: "flex",
  flexDirection: "column",
  transition: "border-color 120ms, box-shadow 120ms",
};
