/**
 * The site serves two independently editable landing pages: the free one at
 * "/" and the premium ($27) one at "/premium". Each has its own content file,
 * its own draft and its own Publish — nothing is shared, so the operator can
 * take them in different directions without one leaking into the other.
 */
export const LANDING_VARIANTS = ["free", "premium"] as const;
export type LandingVariant = (typeof LANDING_VARIANTS)[number];

export type VariantConfig = {
  /** Shown in the editor's page switcher. */
  label: string;
  /** Public route of the page. */
  path: string;
  /** Repo file committed by Publish. */
  contentFile: string;
  /** Vercel Blob key holding the unpublished draft. */
  draftKey: string;
  /** Per-variant localStorage key — drafts must never collide. */
  storageKey: string;
};

export const VARIANTS: Record<LandingVariant, VariantConfig> = {
  free: {
    label: "Free landing",
    path: "/",
    contentFile: "content/content.json",
    draftKey: "drafts/nik.json",
    storageKey: "adv:draft:v1",
  },
  premium: {
    label: "Premium landing",
    path: "/premium",
    contentFile: "content/content.premium.json",
    draftKey: "drafts/nik.premium.json",
    storageKey: "adv:draft:v1:premium",
  },
};

/** Anything unrecognised falls back to the free page — the safe default. */
export function parseVariant(value: string | null | undefined): LandingVariant {
  return value === "premium" ? "premium" : "free";
}
