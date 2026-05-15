import { Icons } from "../../_sections/_shared/Icons";
import { BackLink } from "../_components/BackLink";

export default function SettingsPage() {
  const repo = process.env.GITHUB_REPO || "(not configured)";
  const branch = process.env.GITHUB_BRANCH || "main";
  const ghlAudit = !!process.env.GHL_AUDIT_WEBHOOK_URL;
  const anthropic = !!process.env.ANTHROPIC_API_KEY;
  const pagespeed = !!process.env.GOOGLE_PAGESPEED_API_KEY;
  const blob = !!process.env.BLOB_READ_WRITE_TOKEN;

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
            <span style={{ color: ok ? "#16a34a" : "#dc2626", fontSize: 12, fontWeight: 600 }}>{ok ? "OK" : "Missing"}</span>
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
    <div style={{ maxWidth: 760, display: "flex", flexDirection: "column", gap: 28 }}>
      <BackLink />
      <div>
        <div
          style={{
            font: "600 10px/1 var(--adv-font, system-ui)",
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: "#a1a1aa",
            marginBottom: 10,
          }}
        >
          Status · Integrations
        </div>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 600,
            margin: "0 0 8px",
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            color: "#18181b",
          }}
        >
          Everything the audit pipeline depends on.
        </h1>
        <p style={{ color: "#71717a", margin: 0, fontSize: 15, lineHeight: 1.55, maxWidth: 620 }}>
          Live status of every integration the site connects to. Edit the values in the
          Vercel dashboard.
        </p>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e7e7ea", borderRadius: 12, padding: "0 20px" }}>
        <Row label="GitHub repo" description="Stores the landing page content. Each publish = one commit." ok={repo !== "(not configured)"} value={`${repo} · ${branch}`} />
        <Row label="Vercel Blob" description="Stores uploaded media and the AI audit prompts." ok={blob} />
        <Row label="Anthropic API (Claude)" description="Generates the personalized audit email. Required for the audit pipeline." ok={anthropic} />
        <Row label="GHL Audit webhook" description="Endpoint where finished audit emails are sent for delivery." ok={ghlAudit} />
        <Row label="Google PageSpeed API" description="Performance metrics for the audit. Optional — the audit degrades gracefully without it." ok={pagespeed} />
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
        Open the Vercel dashboard
      </a>
    </div>
  );
}
