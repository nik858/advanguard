import { Icons } from "../../_sections/_shared/Icons";

export default function LeadMagnetPage() {
  return (
    <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 600, margin: "0 0 6px" }}>Lead Magnet</h1>
        <p style={{ color: "#71717a", margin: 0, fontSize: 15 }}>
          Configuration du formulaire de capture présent sur ta landing.
        </p>
      </div>

      <div style={{ padding: 20, background: "#fff", border: "1px solid #e7e7ea", borderRadius: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#71717a", marginBottom: 12 }}>
          <Icons.Megaphone />
          <span style={{ fontSize: 13, fontWeight: 500 }}>Comment ça marche</span>
        </div>
        <ol style={{ marginTop: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.7, color: "#27272a" }}>
          <li>Un visiteur entre son email pro sur ta landing.</li>
          <li>Le formulaire bloque automatiquement les adresses génériques (Gmail, Yahoo…).</li>
          <li>Les leads sont envoyés immédiatement à ton workflow GoHighLevel.</li>
          <li>GoHighLevel envoie l&apos;email de confirmation et déclenche l&apos;audit AI (v1.1).</li>
        </ol>
      </div>

      <div style={{ padding: 20, background: "#fafafa", border: "1px dashed #d4d4d8", borderRadius: 12, color: "#71717a", fontSize: 14, lineHeight: 1.6 }}>
        <strong style={{ color: "#27272a", display: "block", marginBottom: 4 }}>Édition du wording du formulaire</strong>
        Le texte des boutons, des labels et des messages est édité directement sur la landing. <a href="/" style={{ color: "#2563eb", textDecoration: "none" }}>Va sur le site</a> et clique sur les champs concernés.
      </div>

      <div style={{ padding: 20, background: "#fafafa", border: "1px dashed #d4d4d8", borderRadius: 12, color: "#71717a", fontSize: 14, lineHeight: 1.6 }}>
        <strong style={{ color: "#27272a", display: "block", marginBottom: 4 }}>À venir</strong>
        Configuration avancée (champs additionnels, validation, redirection après soumission) sera ajoutée si nécessaire.
      </div>
    </div>
  );
}
