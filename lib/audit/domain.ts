// Resolve a clinic's website URL from their email domain.

export function extractDomain(email: string): string {
  const at = email.lastIndexOf("@");
  return email.slice(at + 1).trim().toLowerCase();
}

export function candidateUrls(domain: string): string[] {
  return [`https://${domain}`, `https://www.${domain}`];
}

const FETCH_TIMEOUT_MS = 8000;

async function tryFetch(url: string): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "AdvanguardAuditBot/1.0 (+https://advanguard.vercel.app)" },
    });
    return res;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Tries the candidate URLs in order. Returns the final URL (after redirects)
 * of the first one that responds with a 2xx/3xx, or null if none are reachable.
 */
export async function resolveReachableUrl(domain: string): Promise<string | null> {
  for (const candidate of candidateUrls(domain)) {
    const res = await tryFetch(candidate);
    if (res && res.status < 400) {
      return res.url || new URL(candidate).href;
    }
  }
  return null;
}
