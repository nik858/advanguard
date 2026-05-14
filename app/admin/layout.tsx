import { ToastProvider } from "../_components/Toast";
import { TopBar } from "./_components/TopBar";
import styles from "./_components/layout.module.css";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className={`${styles.shell} adv-admin`}>
        <TopBar />
        <main className={styles.content}>{children}</main>
      </div>
    </ToastProvider>
  );
}
