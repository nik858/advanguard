import { MediaGrid } from "./_components/MediaGrid";

export default function MediaPage() {
  return (
    <div>
      <h1>Médiathèque</h1>
      <p style={{ color: "#475569" }}>Tous les médias uploadés depuis l&apos;éditeur.</p>
      <MediaGrid />
    </div>
  );
}
