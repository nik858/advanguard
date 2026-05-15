import { MediaGrid } from "./_components/MediaGrid";
import { BackLink } from "../_components/BackLink";

export default function MediaPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <BackLink />
      <div>
        <div
          style={{
            font: "600 10px/1 var(--adv-font, system-ui)",
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: "#a1a1aa",
            marginBottom: 10,
          }}
        >
          Library · Uploads
        </div>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 600,
            margin: "0 0 8px",
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            color: "#18181b",
          }}
        >
          Every photo and video on the site.
        </h1>
        <p style={{ color: "#71717a", margin: 0, fontSize: 15, lineHeight: 1.55, maxWidth: 620 }}>
          Files you uploaded from the landing page editor. Copy a URL to reuse one, or delete
          to free up storage.
        </p>
      </div>
      <MediaGrid />
    </div>
  );
}
