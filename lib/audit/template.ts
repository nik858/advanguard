import type { TemplateFontFamily, TemplateStyles } from "@/types/prompts";

export type TemplateVars = {
  /** Pre-rendered HTML for the Claude-generated body. Trusted (already escaped). */
  body_html?: string;
  /** Plain-text body. If provided, body_html is derived from it via bodyToHtml. */
  body?: string;
  subject: string;
  first_name: string;
  signature: string;
  domain: string;
  /** Optional visual settings — applied via {{accent_color}} / {{font_family_css}} / etc. */
  styles?: Partial<TemplateStyles>;
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

/** Curated CSS font stacks Nik can pick from without typing them. */
export const FONT_STACKS: Record<TemplateFontFamily, string> = {
  system: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif`,
  serif: `Georgia, Cambria, "Times New Roman", Times, serif`,
  modern: `"Helvetica Neue", Helvetica, Arial, sans-serif`,
  humanist: `Verdana, Geneva, "Lucida Sans", sans-serif`,
};

/** Friendly labels shown in the admin Style picker. */
export const FONT_LABELS: Record<TemplateFontFamily, string> = {
  system: "System (default)",
  serif: "Serif — Georgia",
  modern: "Modern — Helvetica Neue",
  humanist: "Humanist — Verdana",
};

const DEFAULT_STYLES: TemplateStyles = {
  accent_color: "#18181b",
  font_family: "system",
  background_color: "#f5f5f5",
  container_width: 560,
  header_logo_url: "",
};

function isValidHexColor(s: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(s);
}

/**
 * Renders an HTML email template by substituting `{{var}}` placeholders.
 * `body_html` is treated as trusted HTML; every other variable is HTML-escaped.
 * The `styles` object expands into derived placeholders ({{accent_color}},
 * {{font_family_css}}, {{container_width}}, {{background_color}},
 * {{header_logo_html}}). Unknown placeholders are left untouched (fail-safe).
 */
export function renderHtmlTemplate(template: string, vars: TemplateVars): string {
  const body_html = vars.body_html ?? bodyToHtml(vars.body ?? "");
  const styles: TemplateStyles = { ...DEFAULT_STYLES, ...(vars.styles ?? {}) };

  // Defensive: reject malformed colors so a typo can't break the HTML.
  const accent = isValidHexColor(styles.accent_color) ? styles.accent_color : DEFAULT_STYLES.accent_color;
  const background = isValidHexColor(styles.background_color) ? styles.background_color : DEFAULT_STYLES.background_color;
  const containerWidth = Math.max(360, Math.min(720, Math.round(styles.container_width)));
  const fontFamilyCss = FONT_STACKS[styles.font_family] ?? FONT_STACKS.system;

  // Header logo: rendered to safe HTML when set, else dropped.
  const headerLogoHtml = styles.header_logo_url
    ? `<img src="${escapeHtmlMinimal(styles.header_logo_url)}" alt="${escapeHtml(vars.signature)}" style="max-height:48px;margin-bottom:24px;display:block;" />`
    : "";

  const safe: Record<string, string> = {
    body_html,
    subject: escapeHtml(vars.subject),
    first_name: escapeHtml(vars.first_name),
    signature: escapeHtml(vars.signature),
    domain: escapeHtml(vars.domain),
    accent_color: accent,
    background_color: background,
    container_width: String(containerWidth),
    font_family_css: fontFamilyCss,
    header_logo_html: headerLogoHtml,
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
