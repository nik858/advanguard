export default function SettingsPage() {
  const repo = process.env.GITHUB_REPO || "(non configuré)";
  const branch = process.env.GITHUB_BRANCH || "main";
  const ghlLead = !!process.env.GHL_LEAD_WEBHOOK_URL;
  const ghlAudit = !!process.env.GHL_AUDIT_WEBHOOK_URL;
  const blob = !!process.env.BLOB_READ_WRITE_TOKEN;
  const kv = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

  function Row({ label, ok, value }: { label: string; ok: boolean; value?: string }) {
    return (
      <tr style={{ borderBottom: "1px solid #eee" }}>
        <td style={{ padding: 10 }}>{label}</td>
        <td style={{ padding: 10, color: ok ? "#15803d" : "#b91c1c" }}>{ok ? "✓ OK" : "✗ manquant"}</td>
        <td style={{ padding: 10, color: "#475569", fontFamily: "monospace", fontSize: 13 }}>{value || ""}</td>
      </tr>
    );
  }

  return (
    <div>
      <h1>Réglages</h1>
      <p style={{ color: "#475569" }}>État de la configuration (lecture seule). Modifie les variables d&apos;environnement dans le dashboard Vercel.</p>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 20 }}>
        <tbody>
          <Row label="Repo GitHub" ok={repo !== "(non configuré)"} value={`${repo} (${branch})`} />
          <Row label="Vercel Blob" ok={blob} />
          <Row label="Upstash KV (rate limit)" ok={kv} />
          <Row label="Webhook GHL Lead" ok={ghlLead} />
          <Row label="Webhook GHL Audit (v1.1)" ok={ghlAudit} />
        </tbody>
      </table>
      <p style={{ marginTop: 24, fontSize: 13, color: "#475569" }}>
        Modifie ces réglages dans le <a href="https://vercel.com/dashboard" target="_blank" rel="noreferrer">dashboard Vercel</a>.
      </p>
    </div>
  );
}
