import * as cheerio from "cheerio";
import type { AnyNode, Element as CheerioElement } from "domhandler";
import { PALETTE_HEX_SET } from "./palette";
import { isAllowedFontSize } from "./font-sizes";

// Canonical (output) allowlist
const ALLOWED_TAGS = new Set(["strong", "em", "u", "br", "span"]);
// Tag whose content (not just wrapper) is dropped
const CONTENT_STRIPPED_TAGS = new Set(["script", "style"]);
// Tags that get normalized into canonical equivalents before serialization
const TAG_REWRITE: Record<string, string> = {
  b: "strong",
  i: "em",
};

const COLOR_HEX_RE = /^\s*#([0-9a-fA-F]{6})\s*$/;
const COLOR_RGB_RE = /^\s*rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)\s*$/i;

/**
 * Normalises a color value (hex `#xxxxxx`, rgb(r,g,b)) to lowercase `#xxxxxx`.
 * Returns null if not a recognised color literal.
 */
function normaliseColor(raw: string): string | null {
  const hex = raw.match(COLOR_HEX_RE);
  if (hex) return ("#" + hex[1]).toLowerCase();
  const rgb = raw.match(COLOR_RGB_RE);
  if (rgb) {
    const r = parseInt(rgb[1], 10);
    const g = parseInt(rgb[2], 10);
    const b = parseInt(rgb[3], 10);
    if (r > 255 || g > 255 || b > 255) return null;
    return "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("");
  }
  return null;
}

/**
 * Extracts the first `color:` declaration from a CSS style attribute and
 * normalises it. Returns the hex string if valid+in-palette, null otherwise.
 */
function styleColorFromAttr(style: string): string | null {
  for (const decl of style.split(";")) {
    const idx = decl.indexOf(":");
    if (idx < 0) continue;
    const prop = decl.slice(0, idx).trim().toLowerCase();
    if (prop !== "color") continue;
    const val = decl.slice(idx + 1);
    const hex = normaliseColor(val);
    if (hex && PALETTE_HEX_SET.has(hex)) return hex;
  }
  return null;
}

/**
 * Extracts the first `font-size:` declaration if it's a whitelisted px value.
 * Anything else (em/rem/%/unknown px) is dropped — keeps untrusted input from
 * scaling text arbitrarily.
 */
function styleFontSizeFromAttr(style: string): number | null {
  for (const decl of style.split(";")) {
    const idx = decl.indexOf(":");
    if (idx < 0) continue;
    const prop = decl.slice(0, idx).trim().toLowerCase();
    if (prop !== "font-size") continue;
    const m = decl.slice(idx + 1).match(/^\s*(\d+(?:\.\d+)?)\s*px\s*$/i);
    if (!m) return null;
    const px = Math.round(parseFloat(m[1]));
    if (isAllowedFontSize(px)) return px;
    return null;
  }
  return null;
}

function walkSanitize(node: AnyNode): string {
  if (node.type === "text") {
    return ((node as { data?: string }).data ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  if (node.type !== "tag" && node.type !== "script" && node.type !== "style") return "";

  const el = node as CheerioElement;
  const rawTag = el.name.toLowerCase();

  if (CONTENT_STRIPPED_TAGS.has(rawTag)) return "";

  // Normalise <b>/<i> to <strong>/<em>
  const tag = TAG_REWRITE[rawTag] ?? rawTag;

  let inner = "";
  for (const child of el.children) {
    inner += walkSanitize(child);
  }

  // <font color="..."> — drop the tag and rewrap inner text in a color span (if palette-valid).
  if (rawTag === "font") {
    const color = el.attribs?.color ? normaliseColor(el.attribs.color) : null;
    if (color && PALETTE_HEX_SET.has(color)) {
      return `<span style="color:${color}">${inner}</span>`;
    }
    return inner;
  }

  if (!ALLOWED_TAGS.has(tag)) return inner;

  if (tag === "br") return "<br>";

  // Span handling: keep `color:` and/or `font-size:` if they are palette / preset-valid.
  if (tag === "span") {
    const styleAttr = el.attribs?.style;
    const color = styleAttr ? styleColorFromAttr(styleAttr) : null;
    const fontSize = styleAttr ? styleFontSizeFromAttr(styleAttr) : null;
    const decls: string[] = [];
    if (color) decls.push(`color:${color}`);
    if (fontSize) decls.push(`font-size:${fontSize}px`);
    if (decls.length) return `<span style="${decls.join(";")}">${inner}</span>`;
    // Strip the (now empty) span wrapper to avoid noisy <span> with no attributes.
    return inner;
  }

  // strong / em / u: emit canonical tag, no attributes.
  return `<${tag}>${inner}</${tag}>`;
}

export function sanitizeRichText(input: string): string {
  if (!input) return "";
  const $ = cheerio.load(input, null, false);
  let out = "";
  $.root().contents().each((_, node) => {
    out += walkSanitize(node as AnyNode);
  });
  return out;
}
