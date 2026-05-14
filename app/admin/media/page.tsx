import { MediaGrid } from "./_components/MediaGrid";
import { BackLink } from "../_components/BackLink";

export default function MediaPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <BackLink />
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 600, margin: "0 0 6px" }}>Médiathèque</h1>
        <p style={{ color: "#71717a", margin: 0, fontSize: 15 }}>Tous les médias uploadés depuis l&apos;éditeur de la landing.</p>
      </div>
      <MediaGrid />
    </div>
  );
}
