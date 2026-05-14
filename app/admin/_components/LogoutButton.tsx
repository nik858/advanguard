"use client";
import { useRouter } from "next/navigation";
import { Icons } from "../../_sections/_shared/Icons";

export function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/admin/login");
  }
  return (
    <button
      onClick={logout}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: "transparent",
        color: "var(--adv-text-muted, #71717a)",
        border: "1px solid var(--adv-border, #e7e7ea)",
        padding: "6px 12px",
        borderRadius: 6,
        cursor: "pointer",
        fontFamily: "var(--adv-font, system-ui)",
        fontSize: 13,
        fontWeight: 500,
      }}
    >
      <Icons.LogOut />
      Sign out
    </button>
  );
}
