/**
 * One-off recovery probe. Lists every blob under `prompts/` in the project's
 * Vercel Blob store and prints each one's pathname, size, upload date and
 * (when the JSON is parseable) the first 300 chars of the body.
 *
 * Usage:
 *   1. `vercel env pull .env.local`  (one-time, gets BLOB_READ_WRITE_TOKEN)
 *   2. `npx tsx scripts/probe-prompts-blob.ts`
 *
 * If the client's edited prompts ever ended up at a different pathname (e.g.
 * an old key, a stale rename), they show up here and we can copy the URL
 * to recover the body verbatim before it disappears.
 */
import { list } from "@vercel/blob";

async function main() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.error("BLOB_READ_WRITE_TOKEN missing — run `vercel env pull .env.local` first, then `dotenv -e .env.local -- npx tsx scripts/probe-prompts-blob.ts`.");
    process.exit(1);
  }

  const { blobs } = await list({ prefix: "prompts/", token });
  if (blobs.length === 0) {
    console.log("No blobs found under prompts/. Storage is empty — fallback to bundled defaults is in effect.");
    return;
  }

  console.log(`Found ${blobs.length} blob(s) under prompts/:\n`);
  for (const b of blobs) {
    console.log(`• ${b.pathname}`);
    console.log(`    size:        ${b.size} bytes`);
    console.log(`    uploadedAt:  ${b.uploadedAt.toISOString()}`);
    console.log(`    url:         ${b.url}`);
    try {
      const res = await fetch(b.url, { cache: "no-store" });
      if (!res.ok) {
        console.log(`    body:        <fetch failed: ${res.status}>`);
      } else {
        const text = await res.text();
        const preview = text.length > 300 ? `${text.slice(0, 300)}…` : text;
        console.log(`    body (first 300 chars):\n${preview.split("\n").map((l) => `      ${l}`).join("\n")}`);
      }
    } catch (e) {
      console.log(`    body:        <fetch error: ${(e as Error).message}>`);
    }
    console.log("");
  }
}

main().catch((e) => {
  console.error("Probe failed:", e);
  process.exit(1);
});
