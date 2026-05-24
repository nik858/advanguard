/**
 * Lists every blob under `media/` in Vercel Blob, cross-references with
 * everything currently referenced by `content/content.json` (the published
 * landing copy) and the live editor draft (Blob `drafts/nik.json`), then
 * reports which blobs are referenced and which are orphans.
 *
 * Pass `--delete` to actually delete the orphans. Without the flag it only
 * prints, so the script is safe by default.
 *
 * Usage:
 *   export $(grep -E '^BLOB_READ_WRITE_TOKEN=' .env.local | xargs) \
 *     && npx tsx scripts/cleanup-orphan-blobs.ts            # dry run
 *     && npx tsx scripts/cleanup-orphan-blobs.ts --delete   # really delete
 */
import { list, del } from "@vercel/blob";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DRY_RUN = !process.argv.includes("--delete");

function collectStrings(node: unknown, out: string[]): void {
  if (node == null) return;
  if (typeof node === "string") { out.push(node); return; }
  if (Array.isArray(node)) { for (const x of node) collectStrings(x, out); return; }
  if (typeof node === "object") {
    for (const v of Object.values(node as Record<string, unknown>)) collectStrings(v, out);
  }
}

function referencedPathnames(doc: unknown): Set<string> {
  const strings: string[] = [];
  collectStrings(doc, strings);
  const out = new Set<string>();
  const re = /\.public\.blob\.vercel-storage\.com\/(media\/[^"'\s)]+)/g;
  for (const s of strings) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(s)) !== null) {
      out.add(decodeURIComponent(m[1]));
    }
  }
  return out;
}

async function main() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.error("BLOB_READ_WRITE_TOKEN missing.");
    process.exit(1);
  }

  // 1. Pathnames currently referenced by published content.
  const publishedPath = join(process.cwd(), "content", "content.json");
  const published = JSON.parse(readFileSync(publishedPath, "utf-8"));
  const referenced = referencedPathnames(published);

  // 2. Pathnames referenced by the live editor draft, so we never delete an
  //    asset the operator pasted in but has not published yet.
  try {
    const { blobs } = await list({ prefix: "drafts/", token });
    const draftBlob = blobs.find((b) => b.pathname === "drafts/nik.json");
    if (draftBlob) {
      const res = await fetch(draftBlob.url, { cache: "no-store" });
      if (res.ok) {
        const draftDoc = await res.json();
        for (const p of referencedPathnames(draftDoc)) referenced.add(p);
      } else {
        console.warn(`  [warn] drafts/nik.json: ${res.status} ${res.statusText} (draft assets cannot be checked).`);
      }
    }
  } catch (e) {
    console.warn(`  [warn] could not read draft: ${(e as Error).message}`);
  }

  // 3. List everything stored under media/.
  const { blobs } = await list({ prefix: "media/", limit: 1000, token });
  const orphans: typeof blobs = [];
  const keepers: typeof blobs = [];
  for (const b of blobs) {
    if (referenced.has(b.pathname)) keepers.push(b);
    else orphans.push(b);
  }

  const fmt = (b: { pathname: string; size: number; uploadedAt: Date }) =>
    `${(b.size / 1024 / 1024).toFixed(2).padStart(8)} MB  ${b.uploadedAt.toISOString().slice(0,10)}  ${b.pathname}`;

  console.log(`\n— KEPT (referenced by content.json / live draft) — ${keepers.length} file(s):`);
  for (const b of keepers.sort((a, b) => b.size - a.size)) console.log(`  ${fmt(b)}`);

  console.log(`\n— ORPHANS (not referenced anywhere) — ${orphans.length} file(s):`);
  for (const b of orphans.sort((a, b) => b.size - a.size)) console.log(`  ${fmt(b)}`);

  const orphanBytes = orphans.reduce((s, b) => s + b.size, 0);
  console.log(`\nOrphan total: ${(orphanBytes / 1024 / 1024).toFixed(1)} MB across ${orphans.length} file(s).`);

  if (orphans.length === 0) {
    console.log("Nothing to delete.");
    return;
  }

  if (DRY_RUN) {
    console.log("\n[dry run] Pass --delete to actually remove the orphans.");
    return;
  }

  console.log("\nDeleting orphans…");
  for (const b of orphans) {
    try {
      await del(b.url, { token });
      console.log(`  deleted: ${b.pathname}`);
    } catch (e) {
      console.log(`  FAILED ${b.pathname}: ${(e as Error).message}`);
    }
  }
  console.log("\nDone.");
}

main().catch((e) => {
  console.error("Cleanup failed:", e);
  process.exit(1);
});
