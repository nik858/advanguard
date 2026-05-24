import { parsePromptsPayload, PromptsV2Schema, type PromptsV2 } from "@/types/prompts";
import { loadPromptsBlob } from "@/lib/blob";
import { getFile } from "@/lib/github";
import bundledDefault from "@/content/prompts.json";

/**
 * Loads the active prompt set with a three-tier fallback chain:
 *   1. Vercel Blob (fast path, what the admin's last Save wrote there).
 *   2. content/prompts.json on the configured GitHub branch (fetched live).
 *      Covers the case where the Blob store is paused/suspended or where the
 *      operator just clicked Save but the next deploy has not landed yet.
 *   3. The bundled content/prompts.json baked into this build (last-resort
 *      default — what existed when this code was compiled).
 *
 * v1 payloads stored in Blob are migrated in memory to v2.
 */
export async function loadPrompts(): Promise<PromptsV2> {
  const fromBlob = await loadPromptsBlob();
  if (fromBlob) {
    const parsed = parsePromptsPayload(fromBlob);
    if (parsed) return parsed;
  }
  // Blob unreachable / empty — read the live committed file from GitHub.
  // The admin's most recent Save committed there, so this is up-to-date even
  // when the Blob is suspended. Failure here is non-fatal.
  try {
    const file = await getFile("content/prompts.json");
    const parsed = parsePromptsPayload(file.content);
    if (parsed) return parsed;
  } catch {
    /* GITHUB_TOKEN unset, rate-limited, or branch unavailable — drop to bundled. */
  }
  return PromptsV2Schema.parse(bundledDefault);
}
