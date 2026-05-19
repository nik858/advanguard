export type TemplateVars = {
  /** Pre-rendered HTML for the Claude-generated body. Trusted (already escaped). */
  body_html?: string;
  /** Plain-text body. If provided, body_html is derived from it via bodyToHtml. */
  body?: string;
  subject: string;
  first_name: string;
  signature: string;
  domain: string;
};

function escapeHtmlMinimal(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeHtml(s: string): string {
  return escapeHtmlMinimal(s).replace(/'/g, "&#39;");
}

/**
 * Wraps a plain-text email body in HTML paragraphs. Pure function — kept local
 * to the template module so callers (template renderer, audit pipeline) don't
 * have a transitive dependency on lib/email.
 */
export function bodyToHtml(body: string): string {
  return body
    .replace(/\r\n?/g, "\n")
    .split(/\n\n+/)
    .map((p) => `<p>${escapeHtmlMinimal(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/**
 * Renders an HTML email template by substituting `{{var}}` placeholders.
 * `body_html` is treated as trusted HTML; every other variable is HTML-escaped.
 * Unknown placeholders are left untouched (fail-safe — keeps preview readable
 * even if Nik mistypes a name).
 */
export function renderHtmlTemplate(template: string, vars: TemplateVars): string {
  const body_html = vars.body_html ?? bodyToHtml(vars.body ?? "");
  const safe: Record<string, string> = {
    body_html,
    subject: escapeHtml(vars.subject),
    first_name: escapeHtml(vars.first_name),
    signature: escapeHtml(vars.signature),
    domain: escapeHtml(vars.domain),
  };
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return key in safe ? safe[key] : match;
  });
}

/** Sample variables used by the admin preview when there's no real lead. */
export const SAMPLE_TEMPLATE_VARS: TemplateVars = {
  body: "Quick note about acmedental.com — your booking widget is on the homepage but missing from your veneers page. That's the page most people land on from Google when they search for veneers in your area.\n\nMobile usability is at 48 too, which means a lot of those visitors bounce before they even see the booking link.\n\nHappy to walk through what I'd fix first if useful?",
  subject: "Two friction points on acmedental.com",
  first_name: "Alex",
  signature: "Nik · Booking Leak",
  domain: "acmedental.com",
};
