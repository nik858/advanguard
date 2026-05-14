import Link from "next/link";
import { BackLink } from "../_components/BackLink";
import { Icons } from "../../_sections/_shared/Icons";
import styles from "../_components/ui.module.css";

const steps: { title: string; body: string }[] = [
  {
    title: "Capture du lead",
    body: "Un visiteur entre son email professionnel dans le formulaire de la landing.",
  },
  {
    title: "Validation automatique",
    body: "Les adresses génériques (Gmail, Yahoo, Outlook…) sont bloquées — seuls les emails pro passent.",
  },
  {
    title: "Envoi vers GoHighLevel",
    body: "Le lead est transmis instantanément à ton workflow GHL, qui envoie l'email de confirmation.",
  },
  {
    title: "Audit du site (v1.1)",
    body: "L'outil identifie le site de la clinique depuis le domaine de l'email, puis extrait des signaux : performance, SEO, schema, preuve sociale, prise de rendez-vous…",
  },
  {
    title: "Génération de l'email AI (v1.1)",
    body: "Claude rédige un email personnalisé avec des recommandations concrètes basées sur l'audit.",
  },
  {
    title: "Séquence automatique (v1.1)",
    body: "L'email part via GoHighLevel, qui gère ensuite toute la séquence de relance.",
  },
];

export default function FunnelPage() {
  return (
    <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 24 }}>
      <BackLink />

      <div>
        <h1 style={{ fontSize: 26, fontWeight: 600, margin: "0 0 6px", letterSpacing: "-0.01em" }}>
          Tunnel &amp; Audit AI
        </h1>
        <p style={{ color: "#71717a", margin: 0, fontSize: 15, lineHeight: 1.5 }}>
          Voici comment un prospect est capté sur ta landing, puis traité automatiquement de bout en bout.
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
            Modifier le texte du formulaire
          </strong>
          Le wording (titres, labels, boutons, messages de confirmation) se modifie directement sur la
          landing.{" "}
          <Link href="/" style={{ color: "#2563eb", textDecoration: "none" }}>
            Va sur le site
          </Link>{" "}
          et clique sur les champs concernés.
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
            Audit AI — pas encore activé
          </strong>
          Les étapes 4 à 6 arrivent en v1.1. Une fois l&apos;outil en place, tu pourras éditer les
          prompts Claude depuis cette page, sans intervention technique.
        </div>
      </div>
    </div>
  );
}
