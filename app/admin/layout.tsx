import { Sidebar } from "./_components/Sidebar";
import { LogoutButton } from "./_components/LogoutButton";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <Sidebar />
      <div style={{ background: "#fff" }}>
        <header style={{ display: "flex", justifyContent: "flex-end", padding: 16, borderBottom: "1px solid #eee" }}>
          <LogoutButton />
        </header>
        <main style={{ padding: 32 }}>{children}</main>
      </div>
    </div>
  );
}
