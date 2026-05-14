import { z } from "zod";

export const MediaRefSchema = z.union([
  z.string(),
  z.object({
    url: z.string(),
    width: z.number().optional(),
    height: z.number().optional(),
    alt: z.string().optional(),
  }),
]);

export type MediaRef = z.infer<typeof MediaRefSchema>;

export function mediaUrl(m: MediaRef | null | undefined): string {
  if (!m) return "";
  return typeof m === "string" ? m : m.url;
}

/* ---------- Shared object schemas (used by both v1 and v2) ---------- */

export const MetaSchema = z.object({
  title: z.string(),
  description: z.string(),
  brand: z.string(),
  productName: z.string(),
  canonical: z.string(),
  ogImage: MediaRefSchema,
});
export type MetaContent = z.infer<typeof MetaSchema>;

export const HeaderSchema = z.object({
  orderByPhone: z.string(),
  needHelp: z.string(),
  logoLight: MediaRefSchema.nullable(),
  logoDark: MediaRefSchema.nullable(),
  logoText: z.string(),
});
export type HeaderContent = z.infer<typeof HeaderSchema>;

export const HeadlineSchema = z.object({
  eyebrow: z.string(),
  eyebrowDotColor: z.string(),
  h1: z.string(),
  sub: z.string(),
});
export type HeadlineContent = z.infer<typeof HeadlineSchema>;

export const HeroSchema = z.object({
  videoLabel: z.string(),
  videoUrl: z.string(),
  videoPoster: MediaRefSchema,
  sectionTitle: z.string(),
  sectionBody: z.string(),
});
export type HeroContent = z.infer<typeof HeroSchema>;

export const OrderSchema = z.object({
  badge: z.string(),
  productName: z.string(),
  productSubtitle: z.string(),
  limitedTime: z.string(),
  priceWas: z.string(),
  priceNow: z.string(),
  priceSubLine: z.string(),
  description: z.string(),
  ctaTagline: z.string(),
  ctaLabel: z.string(),
  secureText: z.string(),
  guaranteeText: z.string(),
  ratingText: z.string(),
  miniTestimonials: z.array(
    z.object({
      avatar: MediaRefSchema,
      name: z.string(),
      role: z.string(),
      quote: z.string(),
    })
  ),
});
export type OrderContent = z.infer<typeof OrderSchema>;

export const AuthoritySchema = z.object({
  title: z.string(),
  logos: z.array(z.string()),
});
export type AuthorityContent = z.infer<typeof AuthoritySchema>;

export const OnlySystemSchema = z.object({
  eyebrow: z.string(),
  eyebrowDotColor: z.string(),
  h2: z.string(),
  body: z.string(),
  leftFeatures: z.array(z.object({ title: z.string(), body: z.string() })),
  rightFeatures: z.array(z.object({ title: z.string(), body: z.string() })),
  stats: z.array(z.object({ value: z.string(), label: z.string() })),
  ctaTagline: z.string(),
  ctaLabel: z.string(),
  ctaSubLink: z.string(),
  guaranteeText: z.string(),
});
export type OnlySystemContent = z.infer<typeof OnlySystemSchema>;

export const DemoSchema = z.object({
  h2: z.string(),
  videoUrl: z.string(),
  videoPoster: MediaRefSchema,
});
export type DemoContent = z.infer<typeof DemoSchema>;

export const TestimonialsSchema = z.object({
  rating: z.string(),
  h2: z.string(),
  pullQuote: z.string(),
  items: z.array(
    z.discriminatedUnion("type", [
      z.object({
        type: z.literal("video"),
        videoUrl: z.string(),
        videoPoster: MediaRefSchema,
        name: z.string(),
        role: z.string(),
        quote: z.string(),
      }),
      z.object({
        type: z.literal("text"),
        avatar: MediaRefSchema,
        name: z.string(),
        role: z.string(),
        quote: z.string(),
        highlights: z.array(z.string()).default([]),
      }),
    ])
  ),
});
export type TestimonialsContent = z.infer<typeof TestimonialsSchema>;

export const StackSchema = z.object({
  h2: z.string(),
  bigStackImg: MediaRefSchema,
  items: z.array(
    z.object({
      kind: z.enum(["book", "ipad"]),
      title: z.string(),
      sub: z.string(),
      body: z.string(),
      access: z.string(),
      priceWas: z.string(),
      priceNow: z.string(),
    })
  ),
  ctaTagline: z.string(),
  ctaLabel: z.string(),
  guaranteeText: z.string(),
});
export type StackContent = z.infer<typeof StackSchema>;

export const GuaranteeSchema = z.object({
  h2: z.string(),
  body: z.string(),
});
export type GuaranteeContent = z.infer<typeof GuaranteeSchema>;

export const FaqSchema = z.object({
  h2: z.string(),
  sub: z.string(),
  items: z.array(z.object({ q: z.string(), a: z.string() })),
});
export type FaqContent = z.infer<typeof FaqSchema>;

export const FooterSchema = z.object({
  disclaimer: z.string(),
  ctaLabel: z.string(),
  ctaTagline: z.string(),
  earnings: z.string(),
  logoText: z.string(),
  copyright: z.string(),
});
export type FooterContent = z.infer<typeof FooterSchema>;

/* ---------- v1 (legacy, fixed keys) ---------- */

export const ContentSchemaV1 = z.object({
  meta: MetaSchema,
  header: HeaderSchema,
  headline: HeadlineSchema,
  hero: HeroSchema,
  order: OrderSchema,
  authority: AuthoritySchema,
  onlySystem: OnlySystemSchema,
  demo: DemoSchema,
  testimonials: TestimonialsSchema,
  stack: StackSchema,
  guarantee: GuaranteeSchema,
  faq: FaqSchema,
  footer: FooterSchema,
});
export type ContentV1 = z.infer<typeof ContentSchemaV1>;

/* ---------- v2 (reorderable section list) ---------- */

export const SectionSchema = z.discriminatedUnion("type", [
  z.object({ id: z.string(), type: z.literal("headline"), hidden: z.boolean().optional(), data: z.object({ headline: HeadlineSchema }) }),
  z.object({ id: z.string(), type: z.literal("hero"), hidden: z.boolean().optional(), data: z.object({ hero: HeroSchema, order: OrderSchema }) }),
  z.object({ id: z.string(), type: z.literal("authority"), hidden: z.boolean().optional(), data: z.object({ authority: AuthoritySchema }) }),
  z.object({ id: z.string(), type: z.literal("onlySystem"), hidden: z.boolean().optional(), data: z.object({ onlySystem: OnlySystemSchema }) }),
  z.object({ id: z.string(), type: z.literal("demo"), hidden: z.boolean().optional(), data: z.object({ demo: DemoSchema }) }),
  z.object({ id: z.string(), type: z.literal("testimonials"), hidden: z.boolean().optional(), data: z.object({ testimonials: TestimonialsSchema }) }),
  z.object({ id: z.string(), type: z.literal("stack"), hidden: z.boolean().optional(), data: z.object({ stack: StackSchema }) }),
  z.object({ id: z.string(), type: z.literal("guarantee"), hidden: z.boolean().optional(), data: z.object({ guarantee: GuaranteeSchema }) }),
  z.object({ id: z.string(), type: z.literal("faq"), hidden: z.boolean().optional(), data: z.object({ faq: FaqSchema }) }),
]);
export type Section = z.infer<typeof SectionSchema>;
export type SectionType = Section["type"];

export const ContentSchemaV2 = z.object({
  version: z.literal(2),
  meta: MetaSchema,
  header: HeaderSchema,
  footer: FooterSchema,
  sections: z.array(SectionSchema),
});
export type ContentV2 = z.infer<typeof ContentSchemaV2>;

/*
 * `ContentSchema` / `Content` stay pointed at v1 in this task so existing
 * consumers (page.tsx, api routes, section components, content.test.ts)
 * keep compiling and passing. Task 6 repoints them to v2.
 */
export const ContentSchema = ContentSchemaV1;
export type Content = ContentV1;

/* ---------- migration ---------- */

/**
 * Generates a stable section id. Used by later phases for *new* sections.
 * Migration itself uses deterministic ids (= the section type) because a
 * v1 document has exactly one section of each type.
 */
export function genSectionId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  return c?.randomUUID ? c.randomUUID() : `s-${Math.random().toString(36).slice(2, 10)}`;
}

/** Converts any supported content shape (v1 or v2) into a validated v2 document. Pure and deterministic. */
export function migrateContent(raw: unknown): ContentV2 {
  if (raw && typeof raw === "object" && (raw as { version?: unknown }).version === 2) {
    return ContentSchemaV2.parse(raw);
  }
  const v1 = ContentSchemaV1.parse(raw);
  const sections: Section[] = [
    { id: "headline", type: "headline", data: { headline: v1.headline } },
    { id: "hero", type: "hero", data: { hero: v1.hero, order: v1.order } },
    { id: "authority", type: "authority", data: { authority: v1.authority } },
    { id: "onlySystem", type: "onlySystem", data: { onlySystem: v1.onlySystem } },
    { id: "demo", type: "demo", data: { demo: v1.demo } },
    { id: "testimonials", type: "testimonials", data: { testimonials: v1.testimonials } },
    { id: "stack", type: "stack", data: { stack: v1.stack } },
    { id: "guarantee", type: "guarantee", data: { guarantee: v1.guarantee } },
    { id: "faq", type: "faq", data: { faq: v1.faq } },
  ];
  return ContentSchemaV2.parse({
    version: 2,
    meta: v1.meta,
    header: v1.header,
    footer: v1.footer,
    sections,
  });
}

/** Returns the first section of the given type, or undefined. */
export function findSection<T extends SectionType>(
  content: ContentV2,
  type: T,
): Extract<Section, { type: T }> | undefined {
  return content.sections.find((s) => s.type === type) as Extract<Section, { type: T }> | undefined;
}
