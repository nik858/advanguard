import { BackLink } from "../_components/BackLink";
import { PromptEditor } from "./_components/PromptEditor";
import styles from "./_components/funnel.module.css";

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
          Funnel · Lead magnet
        </div>
        <div className={styles.titleRow}>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 600,
              margin: 0,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              color: "#18181b",
            }}
          >
            Le mail d&apos;analyse envoyé à chaque lead
          </h1>
          <span className={styles.help} tabIndex={0} role="button" aria-label="À quoi sert cette page ?">
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.4" />
              <circle cx="8" cy="4.7" r="0.95" fill="currentColor" />
              <path d="M8 7v5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span className={styles.helpBubble} role="tooltip">
              Quand un visiteur dépose son email pro, le système audite son site et Claude lui
              écrit un mail personnalisé. Ces prompts contrôlent comment ce mail est écrit.
              Les modifs prennent effet au prochain audit — aucun déploiement nécessaire.
            </span>
          </span>
        </div>
      </div>
      <PromptEditor />
    </div>
  );
}
