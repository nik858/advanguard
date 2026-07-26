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

/**
 * Normalizes a user-typed clinic URL ("myclinic.com", "www.myclinic.com/fr",
 * "https://myclinic.com") into an absolute https URL, or null if it can't be
 * a real website address.
 */
export function normalizeClinicUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  // Needs at least one dot ("myclinic.com"), no spaces, no bare localhost/IP-ish junk.
  if (!host.includes(".") || host.endsWith(".") || host.startsWith(".")) return null;
  return url.href;
}

/**
 * Resolves a user-provided URL to its final reachable form (after redirects),
 * falling back to the www variant. Returns null when the site doesn't answer.
 */
export async function resolveProvidedUrl(input: string): Promise<string | null> {
  const normalized = normalizeClinicUrl(input);
  if (!normalized) return null;
  const url = new URL(normalized);
  const candidates = [url.href];
  if (!url.hostname.startsWith("www.")) {
    const www = new URL(url.href);
    www.hostname = `www.${url.hostname}`;
    candidates.push(www.href);
  }
  for (const candidate of candidates) {
    const res = await tryFetch(candidate);
    if (res && res.status < 400) {
      return res.url || candidate;
    }
  }
  return null;
}
