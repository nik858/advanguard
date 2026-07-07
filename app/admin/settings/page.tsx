import { Icons } from "../../_sections/_shared/Icons";
import { BackLink } from "../_components/BackLink";
import { getResendSegmentId } from "@/lib/email";

// Live health checks on every load — a present-but-expired token must show red.
export const dynamic = "force-dynamic";

/** True only when GITHUB_TOKEN actually works against the configured repo. */
async function checkGithub(): Promise<boolean> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) return false;
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Contact count of the campaign segment, or null when Resend is unreachable. */
async function getContactCount(): Promise<number | null> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`https://api.resend.com/segments/${getResendSegmentId()}/contacts`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: unknown[]; has_more?: boolean };
    if (!Array.isArray(json.data)) return null;
    return json.data.length;
  } catch {
    return null;
  }
}

export default async function SettingsPage() {
  const repo = process.env.GITHUB_REPO || "(not configured)";
  const branch = process.env.GITHUB_BRANCH || "main";
  const resend = !!process.env.RESEND_API_KEY;
  const anthropic = !!process.env.ANTHROPIC_API_KEY;
  const pagespeed = !!process.env.GOOGLE_PAGESPEED_API_KEY;
  const blob = !!process.env.BLOB_READ_WRITE_TOKEN;
  const [githubOk, contactCount] = await Promise.all([checkGithub(), getContactCount()]);

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
        <Row label="GitHub repo" description="Stores the landing page content. Each publish = one commit. Red means the GITHUB_TOKEN is missing or expired — publishing is blocked until it is replaced in Vercel env vars." ok={githubOk} value={`${repo} · ${branch}`} />
        <Row label="Vercel Blob" description="Stores uploaded media and the AI audit prompts." ok={blob} />
        <Row label="Anthropic API (Claude)" description="Generates the personalized audit email. Required for the audit pipeline." ok={anthropic} />
        <Row label="Resend API" description="Sends the personalized audit email to each lead." ok={resend} />
        <Row label="Resend contact list" description={'Every new lead is also added to the "Bookingleak Leads" contact list in Resend, ready for campaigns.'} ok={contactCount !== null} value={contactCount !== null ? `${contactCount} contact${contactCount === 1 ? "" : "s"}` : undefined} />
        <Row label="Google PageSpeed API" description="Performance metrics for the audit. Optional — the audit degrades gracefully without it." ok={pagespeed} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, alignSelf: "flex-start" }}>
        {[
          { href: "https://resend.com/contacts", label: "Open the contact list (Resend)" },
          { href: "https://resend.com/broadcasts", label: "Create a campaign (Resend Broadcasts)" },
          { href: "https://vercel.com/dashboard", label: "Open the Vercel dashboard" },
        ].map((l) => (
          <a
            key={l.href}
            href={l.href}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "#2563eb",
              fontSize: 13,
              textDecoration: "none",
            }}
          >
            <Icons.ExternalLink />
            {l.label}
          </a>
        ))}
      </div>
    </div>
  );
}
