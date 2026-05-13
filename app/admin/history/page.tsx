import { HistoryList } from "./_components/HistoryList";

export default function HistoryPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 600, margin: "0 0 6px" }}>Historique des publications</h1>
        <p style={{ color: "#71717a", margin: 0, fontSize: 15 }}>Les 30 dernières modifications du contenu de la landing.</p>
      </div>
      <HistoryList />
    </div>
  );
}
