import { BackLink } from "../_components/BackLink";
import { PromptEditor } from "./_components/PromptEditor";

export default function FunnelPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
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
          Funnel · AI audit
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
          The prompts that write every audit email.
        </h1>
        <p style={{ color: "#71717a", margin: 0, fontSize: 15, lineHeight: 1.55, maxWidth: 640 }}>
          When a visitor submits their work email, the system audits their website and Claude
          writes them a personalized email. These prompts control how that email is written.
          Edits take effect on the next audit — no deploy needed.
        </p>
      </div>
      <PromptEditor />
    </div>
  );
}
