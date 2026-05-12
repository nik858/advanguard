"use client";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/admin/login");
  }
  return <button onClick={logout} style={{ background: "transparent", color: "#e2e8f0", border: 0, padding: 8, cursor: "pointer", textAlign: "left" }}>Se déconnecter</button>;
}
