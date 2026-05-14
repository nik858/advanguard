import { put, list, del } from "@vercel/blob";

export const DRAFT_KEY = "drafts/nik.json";

export async function saveDraft(draft: unknown): Promise<void> {
  await put(DRAFT_KEY, JSON.stringify(draft), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export async function loadDraft(): Promise<unknown | null> {
  try {
    const { blobs } = await list({ prefix: DRAFT_KEY });
    const match = blobs.find((b) => b.pathname === DRAFT_KEY);
    if (!match) return null;
    const r = await fetch(match.url, { cache: "no-store" });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

export async function deleteDraft(): Promise<void> {
  try {
    const { blobs } = await list({ prefix: DRAFT_KEY });
    for (const b of blobs) if (b.pathname === DRAFT_KEY) await del(b.url);
  } catch { /* ignore */ }
}

export async function listMedia(): Promise<{ pathname: string; url: string; size: number; uploadedAt: string }[]> {
  const { blobs } = await list({ prefix: "media/" });
  return blobs.map((b) => ({ pathname: b.pathname, url: b.url, size: b.size, uploadedAt: b.uploadedAt.toISOString() }));
}

export const PROMPTS_KEY = "prompts/current.json";

export async function savePrompts(prompts: unknown): Promise<void> {
  await put(PROMPTS_KEY, JSON.stringify(prompts), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export async function loadPromptsBlob(): Promise<unknown | null> {
  try {
    const { blobs } = await list({ prefix: PROMPTS_KEY });
    const match = blobs.find((b) => b.pathname === PROMPTS_KEY);
    if (!match) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const r = await fetch(match.url, { cache: "no-store", signal: controller.signal });
      if (!r.ok) return null;
      return await r.json();
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null;
  }
}

export async function deletePrompts(): Promise<void> {
  try {
    const { blobs } = await list({ prefix: PROMPTS_KEY });
    for (const b of blobs) if (b.pathname === PROMPTS_KEY) await del(b.url);
  } catch {
    /* ignore — if there is nothing to delete, loadPrompts already falls back to the default */
  }
}
