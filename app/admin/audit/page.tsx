import { Icons } from "../../_sections/_shared/Icons";

export default function AuditPage() {
  return (
    <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 600, margin: "0 0 6px" }}>AI Clinic Audit</h1>
        <p style={{ color: "#71717a", margin: 0, fontSize: 15 }}>
          Outil v1.1 — pas encore activé. Voici à quoi il servira.
        </p>
      </div>

      <div style={{ padding: 20, background: "#fff", border: "1px solid #e7e7ea", borderRadius: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#71717a", marginBottom: 12 }}>
          <Icons.Sparkles />
          <span style={{ fontSize: 13, fontWeight: 500 }}>Workflow prévu</span>
        </div>
        <ol style={{ marginTop: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.7, color: "#27272a" }}>
          <li>Le lead soumet son email pro depuis la landing.</li>
          <li>L&apos;audit identifie le site de la clinique à partir du domaine.</li>
          <li>Extraction automatique de signaux (perf, SEO, schema, social proof…).</li>
          <li>Claude AI génère un email personnalisé avec recommandations.</li>
          <li>L&apos;email part automatiquement via GoHighLevel.</li>
        </ol>
      </div>

      <div style={{ padding: 20, background: "#fafafa", border: "1px dashed #d4d4d8", borderRadius: 12, color: "#71717a", fontSize: 14, lineHeight: 1.6 }}>
        <strong style={{ color: "#27272a", display: "block", marginBottom: 4 }}>Édition des prompts AI</strong>
        Une fois l&apos;outil activé, tu pourras modifier les prompts Claude depuis cette page sans intervention dev.
      </div>
    </div>
  );
}
