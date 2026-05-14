import { ToastProvider } from "../_components/Toast";
import { AdminChrome } from "./_components/AdminChrome";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AdminChrome>{children}</AdminChrome>
    </ToastProvider>
  );
}
