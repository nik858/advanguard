import Link from "next/link";

export default function AdminHome() {
  return (
    <div>
      <h1 style={{ fontSize: 28, margin: "0 0 8px" }}>Bienvenue, Nik 👋</h1>
      <p style={{ color: "#475569", marginBottom: 24 }}>Édite ta landing page directement depuis le site, ou utilise les outils du panneau de gauche.</p>
      <Link href="/" style={{ display: "inline-block", background: "#1c7bfd", color: "#fff", padding: "12px 20px", borderRadius: 8, textDecoration: "none", fontWeight: 600 }}>
        Éditer la landing →
      </Link>
    </div>
  );
}
