/**
 * One-off: point the editor draft's hero.videoPoster at the real VSL frame
 * (/media/hero-video-poster.jpg) instead of the fake-player placeholder, so
 * the next admin publish doesn't revert the fix shipped in content.json.
 *
 *   npx tsx --env-file=.env.local scripts/fix-hero-poster-draft.ts
 */
import { loadDraft, saveDraft } from "../lib/blob";

const OLD = "/assets/video-thumbnail.png";
const NEW = "/media/hero-video-poster.jpg";

async function main() {
  const draft = (await loadDraft()) as { sections?: { data?: { hero?: { videoPoster?: string } } }[] } | null;
  if (!draft) { console.log("no draft in Blob — nothing to do"); return; }
  let changed = false;
  for (const s of draft.sections ?? []) {
    const hero = s.data?.hero;
    if (hero && hero.videoPoster === OLD) { hero.videoPoster = NEW; changed = true; }
  }
  if (!changed) { console.log("draft hero poster already up to date"); return; }
  await saveDraft(draft);
  console.log("draft updated: hero.videoPoster →", NEW);
}

main().catch((e) => { console.error(e); process.exit(1); });
