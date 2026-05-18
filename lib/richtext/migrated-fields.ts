/**
 * Dotted paths into the Content tree for fields that store sanitized HTML.
 * Used by the publish endpoint to apply sanitization before committing.
 * Order: alphabetised for readability.
 */
export const RICHTEXT_FIELD_PATHS = [
  "demo.h2",
  "faq.h2",
  "faq.sub",
  "footer.disclaimer",
  "guarantee.body",
  "guarantee.h2",
  "headline.eyebrow",
  "headline.h1",
  "headline.sub",
  "hero.sectionBody",
  "hero.sectionTitle",
  "onlySystem.body",
  "onlySystem.eyebrow",
  "onlySystem.h2",
  "order.badge",
  "order.description",
  "order.guaranteeText",
  "order.productName",
  "order.productSubtitle",
  "stack.guaranteeText",
  "stack.h2",
  "testimonials.h2",
  "testimonials.pullQuote",
] as const;
