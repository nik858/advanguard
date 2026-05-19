import { parsePromptsPayload, PromptsV2Schema, type PromptsV2 } from "@/types/prompts";
import { loadPromptsBlob } from "@/lib/blob";
import bundledDefault from "@/content/prompts.json";

/**
 * Loads the active prompt set. Prefers the live, admin-edited version stored
 * in Vercel Blob; falls back to the bundled default if Blob is empty or invalid.
 *
 * v1 payloads stored in Blob are migrated in memory to v2 — the next admin save
 * persists the new shape.
 */
export async function loadPrompts(): Promise<PromptsV2> {
  const fromBlob = await loadPromptsBlob();
  if (fromBlob) {
    const parsed = parsePromptsPayload(fromBlob);
    if (parsed) return parsed;
  }
  return PromptsV2Schema.parse(bundledDefault);
}
