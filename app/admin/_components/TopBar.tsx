import Link from "next/link";
import { Icons } from "../../_sections/_shared/Icons";
import { LogoutButton } from "./LogoutButton";
import styles from "./layout.module.css";

export function TopBar() {
  return (
    <header className={styles.topbar}>
      <Link href="/admin" aria-label="Tableau de bord" style={{ display: "inline-flex", alignItems: "center" }}>
        <img
          src="/assets/advanguard-logo-dark.png"
          alt="Advanguard"
          width={118}
          height={25}
          style={{ height: "auto", display: "block" }}
        />
      </Link>
      <div className={styles.topbarRight}>
        <Link
          href="/"
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "#71717a",
            textDecoration: "none",
            fontSize: 13,
            fontWeight: 500,
            padding: "6px 10px",
          }}
        >
          <Icons.ExternalLink />
          Voir le site
        </Link>
        <LogoutButton />
      </div>
    </header>
  );
}
