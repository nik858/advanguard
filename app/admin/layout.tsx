import Link from "next/link";
import { Sidebar } from "./_components/Sidebar";
import { LogoutButton } from "./_components/LogoutButton";
import { ToastProvider } from "../_components/Toast";
import { Icons } from "../_sections/_shared/Icons";
import styles from "./_components/layout.module.css";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className={`${styles.shell} adv-admin`}>
        <aside className={styles.sidebar}>
          <Sidebar />
        </aside>
        <div className={styles.main}>
          <header className={styles.header}>
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
              }}
            >
              <Icons.ExternalLink />
              Voir le site
            </Link>
            <LogoutButton />
          </header>
          <main className={styles.content}>{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
