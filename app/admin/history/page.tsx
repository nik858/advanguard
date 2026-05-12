import { HistoryList } from "./_components/HistoryList";

export default function HistoryPage() {
  return (
    <div>
      <h1>Historique des publications</h1>
      <p style={{ color: "#475569" }}>Les 30 dernières modifications de la landing page.</p>
      <HistoryList />
    </div>
  );
}
