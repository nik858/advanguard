import Link from "next/link";
import { Icons } from "../../_sections/_shared/Icons";
import { LogoutButton } from "./LogoutButton";
import styles from "./layout.module.css";
import ui from "./ui.module.css";

export function TopBar() {
  return (
    <header className={styles.topbar}>
      <Link href="/admin" aria-label="Dashboard" style={{ display: "inline-flex", alignItems: "center" }}>
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
          className={ui.iconBtn}
          data-tip="View live site"
          aria-label="View live site"
        >
          <Icons.ExternalLink />
        </Link>
        <Link
          href="/admin/settings"
          className={ui.iconBtn}
          data-tip="Settings"
          aria-label="Settings"
        >
          <Icons.Settings />
        </Link>
        <LogoutButton />
      </div>
    </header>
  );
}
