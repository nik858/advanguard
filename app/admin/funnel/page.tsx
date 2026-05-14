import { BackLink } from "../_components/BackLink";
import { PromptEditor } from "./_components/PromptEditor";

export default function FunnelPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <BackLink />
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 600, margin: "0 0 6px", letterSpacing: "-0.01em" }}>
          AI Audit prompts
        </h1>
        <p style={{ color: "#71717a", margin: 0, fontSize: 15, lineHeight: 1.5, maxWidth: 620 }}>
          When a visitor submits their work email, the system audits their website and Claude
          writes them a personalized email. These prompts control how that email is written.
          Edits take effect on the next audit — no deploy needed.
        </p>
      </div>
      <PromptEditor />
    </div>
  );
}
