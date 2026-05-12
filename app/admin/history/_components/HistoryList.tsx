"use client";
import { useEffect, useState } from "react";

type Commit = { sha: string; message: string; date: string };

export function HistoryList() {
  const [commits, setCommits] = useState<Commit[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/history")
      .then((r) => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((b) => setCommits(b.commits))
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <p style={{ color: "#c62828" }}>Erreur: {error}</p>;
  if (!commits) return <p>Chargement...</p>;
  if (!commits.length) return <p>Aucune publication encore.</p>;

  const repoUrl = process.env.NEXT_PUBLIC_GITHUB_REPO ? `https://github.com/${process.env.NEXT_PUBLIC_GITHUB_REPO}` : "";

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr><th align="left">Date</th><th align="left">Message</th><th></th></tr>
      </thead>
      <tbody>
        {commits.map((c) => (
          <tr key={c.sha} style={{ borderBottom: "1px solid #eee" }}>
            <td style={{ padding: 10, color: "#475569" }}>{new Date(c.date).toLocaleString("fr-FR")}</td>
            <td style={{ padding: 10 }}>{c.message.split("\n")[0]}</td>
            <td style={{ padding: 10 }}>
              {repoUrl && <a href={`${repoUrl}/commit/${c.sha}`} target="_blank" rel="noreferrer">↗ GitHub</a>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
