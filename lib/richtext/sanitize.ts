import { PALETTE_HEX_SET } from "./palette";

const ALLOWED_TAGS = new Set(["strong", "em", "u", "br", "span"]);
const CONTENT_STRIPPED_TAGS = new Set(["script", "style"]);
const ALLOWED_ATTRS_BY_TAG: Record<string, Set<string>> = {
  span: new Set(["style"]),
};
const COLOR_STYLE_RE = /^color:\s*(#[0-9a-fA-F]{6})\s*;?\s*$/;

function walkSanitize(node: Node, doc: Document): string {
  if (node.nodeType === doc.TEXT_NODE) {
    return (node.textContent ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  if (node.nodeType !== doc.ELEMENT_NODE) return "";

  const el = node as Element;
  const tag = el.tagName.toLowerCase();

  if (CONTENT_STRIPPED_TAGS.has(tag)) {
    return "";
  }

  let inner = "";
  el.childNodes.forEach((child) => { inner += walkSanitize(child, doc); });

  if (!ALLOWED_TAGS.has(tag)) {
    return inner;
  }

  if (tag === "br") return "<br>";

  const allowedAttrs = ALLOWED_ATTRS_BY_TAG[tag];
  let attrs = "";
  if (allowedAttrs) {
    for (const { name, value } of Array.from(el.attributes)) {
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
  const doc = new DOMParser().parseFromString(`<div>${input}</div>`, "text/html");
  const root = doc.body.firstChild;
  if (!root) return "";
  let out = "";
  root.childNodes.forEach((child) => { out += walkSanitize(child, doc); });
  return out;
}
