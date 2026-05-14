import { PromptsSchema, type Prompts } from "@/types/prompts";
import { loadPromptsBlob } from "@/lib/blob";
import bundledDefault from "@/content/prompts.json";

/**
 * Loads the active prompt set. Prefers the live, admin-edited version stored
 * in Vercel Blob; falls back to the bundled default if Blob is empty or invalid.
 */
export async function loadPrompts(): Promise<Prompts> {
  const fromBlob = await loadPromptsBlob();
  if (fromBlob) {
    const parsed = PromptsSchema.safeParse(fromBlob);
    if (parsed.success) return parsed.data;
  }
  return PromptsSchema.parse(bundledDefault);
}
