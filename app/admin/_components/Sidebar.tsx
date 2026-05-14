"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icons } from "../../_sections/_shared/Icons";
import type { ReactNode } from "react";

const items: { href: string; label: string; icon: () => ReactNode }[] = [
  { href: "/admin", label: "Landing Page", icon: () => <Icons.FileText /> },
  { href: "/admin/lead-magnet", label: "Lead Magnet", icon: () => <Icons.Megaphone /> },
  { href: "/admin/audit", label: "AI Audit", icon: () => <Icons.Sparkles /> },
  { href: "/admin/media", label: "Médiathèque", icon: () => <Icons.Image /> },
  { href: "/admin/settings", label: "Réglages", icon: () => <Icons.Settings /> },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <nav
      style={{
        width: 240,
        background: "#0a0a0a",
        color: "#e4e4e7",
        padding: "20px 12px",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid #18181b",
      }}
    >
      <div style={{ padding: "4px 12px 24px" }}>
        <img
          src="/assets/advanguard-logo-white.png"
          alt="Advanguard"
          width={140}
          height={30}
          style={{ display: "block", height: "auto" }}
        />
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
        {items.map((it) => {
          const active = path === it.href || (it.href !== "/admin" && path.startsWith(it.href));
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "9px 12px",
                  borderRadius: 6,
                  color: active ? "#fafafa" : "#a1a1aa",
                  textDecoration: "none",
                  background: active ? "#27272a" : "transparent",
                  fontSize: 14,
                  fontWeight: active ? 500 : 400,
                  transition: "background 120ms, color 120ms",
                }}
              >
                <span style={{ display: "inline-flex", width: 18, height: 18, alignItems: "center", justifyContent: "center" }} aria-hidden>
                  {it.icon()}
                </span>
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div style={{ borderTop: "1px solid #18181b", paddingTop: 16, marginTop: 16 }}>
        <div style={{ fontSize: 12, color: "#52525b", padding: "0 12px 8px" }}>Connecté</div>
      </div>
    </nav>
  );
}
