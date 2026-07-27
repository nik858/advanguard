/**
 * Returns the URL only if it is http(s), else null.
 *
 * The admin renders links whose values come from outside the app — the
 * booking URL is lifted verbatim from an href on the audited clinic's own
 * website, and the clinic URL is typed by a buyer. A `javascript:` value
 * reaching an `href` would run in the admin's origin the moment an operator
 * clicks it, so the scheme is checked at render time regardless of what the
 * write side did.
 */
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const u = new URL(value.trim());
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}
