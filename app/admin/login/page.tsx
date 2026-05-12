"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/admin";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (res.ok) router.replace(next);
    else if (res.status === 429) setError("Trop de tentatives, réessayez dans 15 minutes.");
    else setError("Mot de passe incorrect.");
  }

  return (
    <form onSubmit={onSubmit} style={{ width: "100%", maxWidth: 360, padding: 32, background: "#fff", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,.06)" }}>
      <h1 style={{ fontSize: 22, margin: "0 0 16px" }}>Connexion admin</h1>
      <label htmlFor="pw" style={{ fontSize: 13, fontWeight: 600 }}>Mot de passe</label>
      <input id="pw" type="password" autoFocus required value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%", padding: "10px 12px", marginTop: 6, border: "1px solid #ddd", borderRadius: 8 }} />
      {error && <p style={{ color: "#c62828", fontSize: 13, marginTop: 12 }}>{error}</p>}
      <button type="submit" disabled={busy} style={{ width: "100%", padding: "10px 12px", marginTop: 16, background: "#1c7bfd", color: "#fff", border: 0, borderRadius: 8, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>
        {busy ? "Connexion..." : "Se connecter"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#fbfbfb" }}>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
