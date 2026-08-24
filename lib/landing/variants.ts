/**
 * The site serves several independently editable landing pages: the free one
 * at "/" and the paid ($27) ones at "/premium" and "/premium.slo". Each has its
 * own content file, its own draft and its own Publish — nothing is shared, so
 * the operator can take them in different directions without one leaking into
 * the other.
 */
export const LANDING_VARIANTS = ["free", "premium", "premium_slo"] as const;
export type LandingVariant = (typeof LANDING_VARIANTS)[number];

/** Extra wiring a paid landing page needs on top of the editable content. */
export type PaidVariantConfig = {
  /** `leads.source` value written on fulfillment — how the CRM tells them apart. */
  leadSource: string;
  /** Per-page LeadGate key: a purchase on one page must not lock the other. */
  gateKey: string;
  /** Where Stripe returns the buyer — a distinct path per page, so the
      conversion tag can be triggered per landing page in GTM. */
  thankYouPath: string;
};

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
  /** Present only on the paid pages; its absence is what marks the free one. */
  paid?: PaidVariantConfig;
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
    paid: {
      leadSource: "paid",
      gateKey: "advanguard_premium_submitted",
      thankYouPath: "/premium/thank-you",
    },
  },
  premium_slo: {
    label: "Premium landing (SLO)",
    path: "/premium.slo",
    contentFile: "content/content.premium.slo.json",
    draftKey: "drafts/nik.premium.slo.json",
    storageKey: "adv:draft:v1:premium-slo",
    paid: {
      leadSource: "paid_slo",
      gateKey: "advanguard_premium_slo_submitted",
      thankYouPath: "/premium.slo/thank-you",
    },
  },
};

/** The paid pages, i.e. the ones a Checkout session can be opened from. */
export const PAID_VARIANTS = LANDING_VARIANTS.filter(
  (v): v is PaidVariant => VARIANTS[v].paid !== undefined,
);
export type PaidVariant = Exclude<LandingVariant, "free">;

/** Narrows to a paid variant, falling back to the original premium page. */
export function parsePaidVariant(value: string | null | undefined): PaidVariant {
  return (PAID_VARIANTS as readonly string[]).includes(value ?? "")
    ? (value as PaidVariant)
    : "premium";
}

/** Config of a paid page — non-optional, unlike VARIANTS[v].paid. */
export function paidConfig(variant: PaidVariant): PaidVariantConfig {
  // Safe by construction: PaidVariant only admits variants that define `paid`.
  return VARIANTS[variant].paid!;
}

/** Anything unrecognised falls back to the free page — the safe default. */
export function parseVariant(value: string | null | undefined): LandingVariant {
  return (LANDING_VARIANTS as readonly string[]).includes(value ?? "")
    ? (value as LandingVariant)
    : "free";
}
