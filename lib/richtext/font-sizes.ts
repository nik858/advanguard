/**
 * Whitelisted font-sizes for inline text overrides. The sanitiser only keeps
 * `font-size:` declarations whose pixel value matches one of these — anything
 * else (em, rem, calc, unknown px) is dropped so untrusted input can't pump
 * arbitrary type sizes into the page.
 */
export const FONT_SIZE_PRESETS = [
  { label: "XS", px: 12 },
  { label: "S", px: 14 },
  { label: "M", px: 18 },
  { label: "L", px: 24 },
  { label: "XL", px: 32 },
  { label: "XXL", px: 48 },
] as const;

export const FONT_SIZE_PX_SET: ReadonlySet<number> = new Set(FONT_SIZE_PRESETS.map((s) => s.px));
