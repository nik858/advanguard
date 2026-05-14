"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function LoginForm() {
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
    if (res.ok) {
      // Hard navigation so the just-set session cookie is sent with the
      // request — a soft router navigation can race the cookie write.
      window.location.href = next;
      return;
    }
    setBusy(false);
    if (res.status === 429) setError("Trop de tentatives. Réessaie dans 15 minutes.");
    else setError("Mot de passe incorrect.");
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "start center", padding: "10vh 24px 24px", background: "#fafafa", fontFamily: "var(--adv-font, system-ui)" }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img src="/assets/advanguard-logo-dark.png" alt="Advanguard" width={140} height={30} style={{ height: "auto" }} />
        </div>
        <form
          onSubmit={onSubmit}
          style={{
            padding: 32,
            background: "#fff",
            borderRadius: 12,
            border: "1px solid #e7e7ea",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 6px", color: "#18181b" }}>Espace admin</h1>
          <p style={{ fontSize: 14, color: "#71717a", margin: "0 0 20px" }}>Connecte-toi pour modifier ta landing.</p>
          <label htmlFor="pw" style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#27272a", marginBottom: 6 }}>Mot de passe</label>
          <input
            id="pw"
            type="password"
            autoFocus
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #d4d4d8",
              borderRadius: 6,
              fontSize: 14,
              fontFamily: "inherit",
              outline: "none",
              transition: "border-color 120ms",
              boxSizing: "border-box",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#18181b")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#d4d4d8")}
          />
          {error && (
            <p style={{ color: "#dc2626", fontSize: 13, marginTop: 10, marginBottom: 0 }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={busy}
            style={{
              width: "100%",
              padding: "10px 12px",
              marginTop: 16,
              background: "#18181b",
              color: "#fff",
              border: 0,
              borderRadius: 6,
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.6 : 1,
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "inherit",
            }}
          >
            {busy ? "Connexion…" : "Se connecter"}
          </button>
        </form>
        <p style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "#a1a1aa" }}>
          Mot de passe oublié ? Contacte TB Dev.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
