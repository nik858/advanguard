// lib/richtext/palette.ts

/**
 * Curated 12-color palette used by the rich-text formatter.
 * Hex values mirror tokens in styles/colors_and_type.css so colored
 * text remains visually consistent with the rest of the site.
 */
export const RICHTEXT_PALETTE = [
  { label: "Black", hex: "#140c0c" },
  { label: "Dark navy", hex: "#061130" },
  { label: "Navy", hex: "#233567" },
  { label: "Gray", hex: "#394976" },
  { label: "Light gray", hex: "#6d6d6d" },
  { label: "White", hex: "#ffffff" },
  { label: "Brand blue", hex: "#1c7fff" },
  { label: "Deep blue", hex: "#1945e0" },
  { label: "Success green", hex: "#38d25a" },
  { label: "Danger red", hex: "#ff0000" },
  { label: "Coral red", hex: "#ec274a" },
  { label: "Warning yellow", hex: "#ffce1e" },
] as const;

export type PaletteColor = (typeof RICHTEXT_PALETTE)[number];

/** Lowercase hex strings accepted in stored HTML `color:` style values. */
export const PALETTE_HEX_SET = new Set(RICHTEXT_PALETTE.map((c) => c.hex.toLowerCase()));
