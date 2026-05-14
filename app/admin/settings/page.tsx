import { Icons } from "../../_sections/_shared/Icons";
import { BackLink } from "../_components/BackLink";

export default function SettingsPage() {
  const repo = process.env.GITHUB_REPO || "(non configuré)";
  const branch = process.env.GITHUB_BRANCH || "main";
  const ghlLead = !!process.env.GHL_LEAD_WEBHOOK_URL;
  const ghlAudit = !!process.env.GHL_AUDIT_WEBHOOK_URL;
  const blob = !!process.env.BLOB_READ_WRITE_TOKEN;
  const kv = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

  type RowProps = { label: string; description: string; ok: boolean; value?: string };
  function Row({ label, description, ok, value }: RowProps) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, padding: "14px 0", borderBottom: "1px solid #f4f4f5" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <span style={{ fontWeight: 500, color: "#18181b" }}>{label}</span>
            <span
              aria-hidden="true"
              style={{
                width: 8, height: 8, borderRadius: 999,
                background: ok ? "#16a34a" : "#dc2626",
                boxShadow: ok ? "0 0 0 3px rgba(22,163,74,.15)" : "0 0 0 3px rgba(220,38,38,.15)",
              }}
            />
            <span style={{ color: ok ? "#16a34a" : "#dc2626", fontSize: 12, fontWeight: 600 }}>{ok ? "OK" : "Manquant"}</span>
          </div>
          <div style={{ fontSize: 13, color: "#71717a" }}>{description}</div>
        </div>
        {value && (
          <div style={{ fontFamily: "var(--adv-font-mono, monospace)", fontSize: 12, color: "#71717a", alignSelf: "center", whiteSpace: "nowrap" }}>{value}</div>
        )}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760, display: "flex", flexDirection: "column", gap: 20 }}>
      <BackLink />
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 600, margin: "0 0 6px" }}>Réglages</h1>
        <p style={{ color: "#71717a", margin: 0, fontSize: 15 }}>État des intégrations. Modifie les valeurs dans le dashboard Vercel.</p>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e7e7ea", borderRadius: 12, padding: "0 20px" }}>
        <Row label="Repo GitHub" description="Stockage du contenu de la landing. Chaque publication = un commit." ok={repo !== "(non configuré)"} value={`${repo} · ${branch}`} />
        <Row label="Vercel Blob" description="Stockage des médias uploadés depuis l'éditeur." ok={blob} />
        <Row label="Rate limit (Upstash KV)" description="Protection anti-bruteforce sur le login et anti-spam sur le formulaire." ok={kv} />
        <Row label="Webhook GHL Lead" description="Endpoint où sont envoyés les leads du formulaire." ok={ghlLead} />
        <Row label="Webhook GHL Audit (v1.1)" description="Endpoint pour l'audit AI (pas encore actif)." ok={ghlAudit} />
      </div>

      <a
        href="https://vercel.com/dashboard"
        target="_blank"
        rel="noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: "#2563eb",
          fontSize: 13,
          textDecoration: "none",
          alignSelf: "flex-start",
        }}
      >
        <Icons.ExternalLink />
        Ouvrir le dashboard Vercel
      </a>
    </div>
  );
}
