"use client";
import { useRouter } from "next/navigation";
import { Icons } from "../../_sections/_shared/Icons";
import ui from "./ui.module.css";

export function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/admin/login");
  }
  return (
    <button
      type="button"
      onClick={logout}
      className={ui.iconBtn}
      data-tip="Sign out"
      aria-label="Sign out"
    >
      <Icons.LogOut />
    </button>
  );
}
