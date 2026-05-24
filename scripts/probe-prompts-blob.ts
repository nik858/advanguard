/**
 * One-off recovery probe. Lists every blob under `prompts/` in the project's
 * Vercel Blob store. Tries to download each one via:
 *   (a) the public URL directly, and
 *   (b) the authenticated `head()` endpoint of `@vercel/blob`.
 * If the store has been suspended/blocked by Vercel ("Your store is
 * blocked"), the public URL returns 403 but the metadata still proves the
 * blob exists. Unblocking the store on the Vercel dashboard makes the
 * content reachable again.
 *
 * Usage (with token loaded from .env.local):
 *   export $(grep -E '^BLOB_READ_WRITE_TOKEN=' .env.local | xargs) \
 *     && npx tsx scripts/probe-prompts-blob.ts
 */
import { list, head } from "@vercel/blob";

async function main() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.error("BLOB_READ_WRITE_TOKEN missing — run `vercel env pull .env.local` first.");
    process.exit(1);
  }

  const { blobs } = await list({ prefix: "prompts/", token });
  if (blobs.length === 0) {
    console.log("No blobs found under prompts/. Storage is empty.");
    return;
  }

  console.log(`Found ${blobs.length} blob(s) under prompts/:\n`);
  for (const b of blobs) {
    console.log(`• ${b.pathname}`);
    console.log(`    size:        ${b.size} bytes`);
    console.log(`    uploadedAt:  ${b.uploadedAt.toISOString()}`);
    console.log(`    url:         ${b.url}`);

    // 1) Authenticated head() — returns metadata without consuming the public
    //    serving path, so it works even when the store is suspended.
    try {
      const meta = await head(b.url, { token });
      console.log(`    contentType: ${meta.contentType}`);
    } catch (e) {
      console.log(`    head:        ${(e as Error).message}`);
    }

    // 2) Public fetch — the way the running app loads the blob. Surfaces
    //    block / suspension messages from Vercel verbatim.
    try {
      const res = await fetch(b.url, { cache: "no-store" });
      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        console.log(`    public:      ${res.status} ${res.statusText} — ${errBody.trim().slice(0, 120)}`);
      } else {
        const text = await res.text();
        console.log(`    public:      200 (${text.length} chars). First 400:`);
        const preview = text.length > 400 ? `${text.slice(0, 400)}…` : text;
        console.log(preview.split("\n").map((l) => `      ${l}`).join("\n"));
      }
    } catch (e) {
      console.log(`    public:      <fetch error: ${(e as Error).message}>`);
    }
    console.log("");
  }
}

main().catch((e) => {
  console.error("Probe failed:", e);
  process.exit(1);
});
