/**
 * Lists everything under `media/` in the project's Vercel Blob store sorted
 * by size, so we can see which assets are dominating the egress quota.
 */
import { list } from "@vercel/blob";

async function main() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.error("BLOB_READ_WRITE_TOKEN missing.");
    process.exit(1);
  }

  const { blobs } = await list({ prefix: "media/", limit: 1000, token });
  const sorted = [...blobs].sort((a, b) => b.size - a.size);
  let total = 0;
  for (const b of sorted) {
    total += b.size;
    const mb = (b.size / 1024 / 1024).toFixed(2);
    console.log(`${mb.padStart(9)} MB  ${b.pathname}`);
  }
  console.log(
    `\nTotal stored under media/: ${(total / 1024 / 1024).toFixed(1)} MB across ${blobs.length} files`,
  );
}

main().catch((e) => {
  console.error("Probe failed:", e);
  process.exit(1);
});
