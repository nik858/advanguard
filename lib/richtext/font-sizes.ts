/**
 * Allowed pixel range for inline font-size overrides. The sanitiser keeps a
 * `font-size:` declaration only if its integer-px value falls inside this
 * range — keeps untrusted input from pumping arbitrary type sizes into the
 * page (and prevents fractional/calc/em values from sneaking through).
 */
export const FONT_SIZE_MIN_PX = 8;
export const FONT_SIZE_MAX_PX = 72;

/** Ordered list of selectable px values shown in the rich-text toolbar dropdown. */
export const FONT_SIZE_OPTIONS: ReadonlyArray<number> = Array.from(
  { length: FONT_SIZE_MAX_PX - FONT_SIZE_MIN_PX + 1 },
  (_, i) => FONT_SIZE_MIN_PX + i,
);

export function isAllowedFontSize(px: number): boolean {
  return Number.isInteger(px) && px >= FONT_SIZE_MIN_PX && px <= FONT_SIZE_MAX_PX;
}
