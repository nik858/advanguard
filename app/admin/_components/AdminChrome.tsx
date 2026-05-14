"use client";
import { usePathname } from "next/navigation";
import { TopBar } from "./TopBar";
import styles from "./layout.module.css";

export function AdminChrome({ children }: { children: React.ReactNode }) {
  const path = usePathname();

  // The login page renders its own full-screen layout — no top bar.
  if (path === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <div className={`${styles.shell} adv-admin`}>
      <TopBar />
      <main className={styles.content}>{children}</main>
    </div>
  );
}
