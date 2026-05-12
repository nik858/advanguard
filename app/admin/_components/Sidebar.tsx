"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin", label: "Landing Page", icon: "📄" },
  { href: "/admin/lead-magnet", label: "Lead Magnet", icon: "📝" },
  { href: "/admin/audit", label: "AI Audit", icon: "🤖" },
  { href: "/admin/media", label: "Médiathèque", icon: "🖼" },
  { href: "/admin/history", label: "Historique", icon: "🕓" },
  { href: "/admin/settings", label: "Réglages", icon: "⚙" },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <nav style={{ width: 240, background: "#0f172a", color: "#e2e8f0", padding: 20, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>ADVANGUARD</div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1 }}>
        {items.map((it) => {
          const active = path === it.href;
          return (
            <li key={it.href}>
              <Link href={it.href} style={{ display: "flex", gap: 10, padding: "10px 12px", borderRadius: 8, color: "inherit", textDecoration: "none", background: active ? "#1e293b" : "transparent" }}>
                <span aria-hidden>{it.icon}</span>
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
