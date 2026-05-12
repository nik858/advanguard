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

export const ContentSchema = z.object({
  meta: z.object({
    title: z.string(),
    description: z.string(),
    brand: z.string(),
    productName: z.string(),
    canonical: z.string(),
    ogImage: MediaRefSchema,
  }),
  header: z.object({
    orderByPhone: z.string(),
    needHelp: z.string(),
    logoLight: MediaRefSchema.nullable(),
    logoDark: MediaRefSchema.nullable(),
    logoText: z.string(),
  }),
  headline: z.object({
    eyebrow: z.string(),
    eyebrowDotColor: z.string(),
    h1: z.string(),
    sub: z.string(),
  }),
  hero: z.object({
    videoLabel: z.string(),
    videoUrl: z.string(),
    videoPoster: MediaRefSchema,
    sectionTitle: z.string(),
    sectionBody: z.string(),
  }),
  order: z.object({
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
  }),
  authority: z.object({
    title: z.string(),
    logos: z.array(z.string()),
  }),
  onlySystem: z.object({
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
  }),
  demo: z.object({
    h2: z.string(),
    videoUrl: z.string(),
    videoPoster: MediaRefSchema,
  }),
  testimonials: z.object({
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
  }),
  stack: z.object({
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
  }),
  guarantee: z.object({
    h2: z.string(),
    body: z.string(),
  }),
  faq: z.object({
    h2: z.string(),
    sub: z.string(),
    items: z.array(z.object({ q: z.string(), a: z.string() })),
  }),
  footer: z.object({
    disclaimer: z.string(),
    ctaLabel: z.string(),
    ctaTagline: z.string(),
    earnings: z.string(),
    logoText: z.string(),
    copyright: z.string(),
  }),
});

export type Content = z.infer<typeof ContentSchema>;
