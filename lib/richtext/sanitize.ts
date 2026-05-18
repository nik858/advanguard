import * as cheerio from "cheerio";
import type { AnyNode, Element as CheerioElement } from "domhandler";
import { PALETTE_HEX_SET } from "./palette";

const ALLOWED_TAGS = new Set(["strong", "em", "u", "br", "span"]);
const CONTENT_STRIPPED_TAGS = new Set(["script", "style"]);
const ALLOWED_ATTRS_BY_TAG: Record<string, Set<string>> = {
  span: new Set(["style"]),
};
const COLOR_STYLE_RE = /^color:\s*(#[0-9a-fA-F]{6})\s*;?\s*$/;

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
  const tag = el.name.toLowerCase();

  // Defence-in-depth: drop both the tag and its inner text for dangerous tags
  // BEFORE recursing, so script/style content never reaches the output.
  if (CONTENT_STRIPPED_TAGS.has(tag)) {
    return "";
  }

  let inner = "";
  for (const child of el.children) {
    inner += walkSanitize(child);
  }

  if (!ALLOWED_TAGS.has(tag)) {
    return inner;
  }

  if (tag === "br") return "<br>";

  const allowedAttrs = ALLOWED_ATTRS_BY_TAG[tag];
  let attrs = "";
  if (allowedAttrs) {
    for (const [name, value] of Object.entries(el.attribs ?? {})) {
      if (!allowedAttrs.has(name)) continue;
      if (name === "style") {
        const m = value.match(COLOR_STYLE_RE);
        if (!m) continue;
        const hex = m[1].toLowerCase();
        if (!PALETTE_HEX_SET.has(hex)) continue;
        attrs += ` style="color:${hex}"`;
      } else {
        attrs += ` ${name}="${value.replace(/"/g, "&quot;")}"`;
      }
    }
  }

  return `<${tag}${attrs}>${inner}</${tag}>`;
}

export function sanitizeRichText(input: string): string {
  if (!input) return "";
  // Parse as a fragment so the HTML5 parser doesn't move script/style into head.
  // The third arg `isDocument = false` is what enables fragment mode.
  const $ = cheerio.load(input, null, false);
  let out = "";
  $.root().contents().each((_, node) => {
    out += walkSanitize(node as AnyNode);
  });
  return out;
}
