import Link from "next/link";
import { BackLink } from "../_components/BackLink";
import { Icons } from "../../_sections/_shared/Icons";
import styles from "../_components/ui.module.css";

const steps: { title: string; body: string }[] = [
  {
    title: "Lead capture",
    body: "A visitor enters their work email in the landing page form.",
  },
  {
    title: "Automatic validation",
    body: "Generic addresses (Gmail, Yahoo, Outlook…) are blocked — only work emails get through.",
  },
  {
    title: "Hand-off to GoHighLevel",
    body: "The lead is sent instantly to your GHL workflow, which sends the confirmation email.",
  },
  {
    title: "Site audit (v1.1)",
    body: "The tool identifies the clinic's website from the email domain, then extracts signals: performance, SEO, schema, social proof, appointment booking…",
  },
  {
    title: "AI email generation (v1.1)",
    body: "Claude writes a personalized email with concrete recommendations based on the audit.",
  },
  {
    title: "Automated sequence (v1.1)",
    body: "The email goes out via GoHighLevel, which then handles the full follow-up sequence.",
  },
];

export default function FunnelPage() {
  return (
    <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 24 }}>
      <BackLink />

      <div>
        <h1 style={{ fontSize: 26, fontWeight: 600, margin: "0 0 6px", letterSpacing: "-0.01em" }}>
          Funnel &amp; AI Audit
        </h1>
        <p style={{ color: "#71717a", margin: 0, fontSize: 15, lineHeight: 1.5 }}>
          Here&apos;s how a prospect is captured on your landing page, then processed automatically end to end.
        </p>
      </div>

      {/* The flow */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #ececef",
          borderRadius: 14,
          padding: "8px 24px",
        }}
      >
        {steps.map((s, i) => (
          <div key={i} className={styles.step}>
            <div className={styles.stepNum}>{i + 1}</div>
            <div className={styles.stepBody}>
              <strong>{s.title}</strong>
              {s.body}
            </div>
          </div>
        ))}
      </div>

      {/* Editing wording note */}
      <div
        style={{
          display: "flex",
          gap: 12,
          padding: 18,
          background: "#fff",
          border: "1px solid #ececef",
          borderRadius: 14,
        }}
      >
        <span style={{ color: "#52525b", flexShrink: 0, marginTop: 1 }}>
          <Icons.Pencil />
        </span>
        <div style={{ fontSize: 14, lineHeight: 1.55, color: "#27272a" }}>
          <strong style={{ display: "block", fontWeight: 600, color: "#18181b", marginBottom: 2 }}>
            Editing the form copy
          </strong>
          The wording (titles, labels, buttons, confirmation messages) is edited directly on the
          landing page.{" "}
          <Link href="/" style={{ color: "#2563eb", textDecoration: "none" }}>
            Go to the site
          </Link>{" "}
          and click the relevant fields.
        </div>
      </div>

      {/* v1.1 note */}
      <div
        style={{
          display: "flex",
          gap: 12,
          padding: 18,
          background: "#fafafa",
          border: "1px dashed #d4d4d8",
          borderRadius: 14,
        }}
      >
        <span style={{ color: "#a1a1aa", flexShrink: 0, marginTop: 1 }}>
          <Icons.Sparkles />
        </span>
        <div style={{ fontSize: 14, lineHeight: 1.55, color: "#71717a" }}>
          <strong style={{ display: "block", fontWeight: 600, color: "#27272a", marginBottom: 2 }}>
            AI Audit — not active yet
          </strong>
          Steps 4 to 6 are coming in v1.1. Once the tool is in place, you&apos;ll be able to edit the
          Claude prompts from this page, with no technical help needed.
        </div>
      </div>
    </div>
  );
}
