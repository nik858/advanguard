# Landing Page Block Editor — Phase 1: Data Model + Migration + Rendering Parity

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 12 hard-coded `content.json` keys with a reorderable `sections[]` list model, with a migration that keeps the live site rendering byte-for-byte identical to today.

**Architecture:** A new `content.json` v2 shape (`{ version, meta, header, footer, sections[] }`) where each `Section` is `{ id, type, hidden?, data }`. `data` is a namespace bag keyed by the original section name (e.g. `{ demo: {...} }`, hero bundles `{ hero, order }`). A pure `migrateContent()` converts v1→v2 deterministically and is applied on every read. A `SectionContext` rewrites editor paths so the existing section components need **zero** changes to their `path` props — they just edit relative to their section's `data`. Public render and editor render both `.map()` over `sections`.

**Tech Stack:** Next.js 16, React 19, Zod 4, Vitest. No new dependencies in this phase (drag-and-drop libs come in Phase 2).

**Out of scope (later phases):** Structure sidebar / reorder UI (Phase 2), in-place media drag-drop & multi-media galleries (Phase 3), list reordering (Phase 4). This phase only changes the *data model* and keeps rendering identical.

---

## File Structure

**Created:**
- `types/content.ts` — rewritten in place (v1 + v2 schemas, named types, `migrateContent`, `findSection`)
- `app/_editor/SectionContext.tsx` — React context carrying the current section's `basePath` for editor path resolution
- `app/_sections/SectionBody.tsx` — server-safe switch: `Section` → section component (shared by public page and editor)
- `tests/lib/migrate-content.test.ts` — migration unit tests

**Modified:**
- `app/_editor/EditableText.tsx` — resolve `path` through `SectionContext`
- `app/_editor/MediaSwapButton.tsx` — resolve `path` through `SectionContext`
- `app/_sections/*.tsx` (12 files) — swap `Content["x"]` annotations for named exported types (mechanical, non-breaking)
- `app/page.tsx` — `migrateContent()`, map over `sections`, fix JSON-LD lookups
- `app/_editor/LandingTree.tsx` — map over `sections`, wrap each in `SectionContext`
- `app/_editor/EditorProvider.tsx` — `migrateContent()` drafts on load
- `app/api/draft/route.ts` — `migrateContent()` on PUT
- `app/api/publish/route.ts` — `migrateContent()` on publish + noop comparison
- `tests/lib/content.test.ts` — migrate before parsing
- `.gitignore` — ignore `.superpowers/`

---

## Task 1: v2 schema, migration, and migration tests

**Files:**
- Modify: `types/content.ts` (full rewrite)
- Create: `tests/lib/migrate-content.test.ts`
- Modify: `.gitignore`

This task is **purely additive** for consumers: `ContentSchema` and `Content` still resolve to v1, so nothing else breaks. v2 schemas, named types, and `migrateContent` are added alongside.

- [ ] **Step 1: Ignore the brainstorming scratch dir**

Append to `.gitignore`:

```
.superpowers/
```

- [ ] **Step 2: Rewrite `types/content.ts`**

Replace the entire file with:

```ts
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
```

- [ ] **Step 3: Write the migration tests**

Create `tests/lib/migrate-content.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { migrateContent, ContentSchemaV2 } from "@/types/content";
import contentJson from "@/content/content.json";

describe("migrateContent", () => {
  it("converts the v1 content.json into a valid v2 document", () => {
    const v2 = migrateContent(contentJson);
    expect(ContentSchemaV2.safeParse(v2).success).toBe(true);
    expect(v2.version).toBe(2);
  });

  it("produces the 9 body sections in canonical order", () => {
    const v2 = migrateContent(contentJson);
    expect(v2.sections.map((s) => s.type)).toEqual([
      "headline", "hero", "authority", "onlySystem", "demo",
      "testimonials", "stack", "guarantee", "faq",
    ]);
  });

  it("bundles hero + order into the hero section's data", () => {
    const v2 = migrateContent(contentJson);
    const hero = v2.sections.find((s) => s.type === "hero");
    expect(hero?.data).toHaveProperty("hero");
    expect(hero?.data).toHaveProperty("order");
  });

  it("keeps meta, header and footer at the top level unchanged", () => {
    const raw = contentJson as Record<string, unknown>;
    const v2 = migrateContent(contentJson);
    expect(v2.meta).toEqual(raw.meta);
    expect(v2.header).toEqual(raw.header);
    expect(v2.footer).toEqual(raw.footer);
  });

  it("is deterministic — two migrations of the same input are equal", () => {
    expect(migrateContent(contentJson)).toEqual(migrateContent(contentJson));
  });

  it("is idempotent on an already-v2 document", () => {
    const once = migrateContent(contentJson);
    expect(migrateContent(once)).toEqual(once);
  });

  it("throws on an unrecognisable shape", () => {
    expect(() => migrateContent({ foo: "bar" })).toThrow();
  });
});
```

- [ ] **Step 4: Run the tests — expect PASS**

Run: `npm test -- migrate-content`
Expected: all 7 tests in `migrate-content.test.ts` PASS.

- [ ] **Step 5: Run the full suite and type-check — expect GREEN**

Run: `npm test && npx tsc --noEmit`
Expected: all existing tests still pass (`content.test.ts` unaffected — `ContentSchema` is still v1), no type errors.

- [ ] **Step 6: Commit**

```bash
git add types/content.ts tests/lib/migrate-content.test.ts .gitignore
git commit -m "feat(content): add v2 section-list schema and migrateContent"
```

---

## Task 2: Switch section components to named content types

**Files:**
- Modify: `app/_sections/Headline.tsx`, `LogoStrip.tsx`, `OnlySystem.tsx`, `Demo.tsx`, `Testimonials.tsx`, `Stack.tsx`, `GuaranteeSection.tsx`, `FAQ.tsx`, `Hero.tsx`, `Header.tsx`, `Footer.tsx`, `OrderForm.tsx`

Mechanical and non-breaking: the named types (`HeadlineContent`, etc.) are inferred from the exact same object schemas that `Content["headline"]` resolves to today. This decouples the components from the top-level `Content` shape so Task 6 can repoint `Content` to v2 without touching them.

- [ ] **Step 1: `Headline.tsx`**

Change the import line `import type { Content } from "@/types/content";` to:
```ts
import type { HeadlineContent } from "@/types/content";
```
Change `content: Content["headline"]` to `content: HeadlineContent`.

- [ ] **Step 2: `LogoStrip.tsx`**

Change `import type { Content } from "@/types/content";` to:
```ts
import type { AuthorityContent } from "@/types/content";
```
Change `content: Content["authority"]` to `content: AuthorityContent`.

- [ ] **Step 3: `OnlySystem.tsx`**

Change `import type { Content } from "@/types/content";` to:
```ts
import type { OnlySystemContent } from "@/types/content";
```
Change `content: Content["onlySystem"]` to `content: OnlySystemContent`.

- [ ] **Step 4: `Demo.tsx`**

Change `import type { Content } from "@/types/content";` to:
```ts
import type { DemoContent } from "@/types/content";
```
Change `content: Content["demo"]` to `content: DemoContent`.

- [ ] **Step 5: `Testimonials.tsx`**

Change `import { mediaUrl, type Content } from "@/types/content";` to:
```ts
import { mediaUrl, type TestimonialsContent } from "@/types/content";
```
Change `content: Content["testimonials"]` to `content: TestimonialsContent`.

- [ ] **Step 6: `Stack.tsx`**

Change `import { mediaUrl, type Content } from "@/types/content";` to:
```ts
import { mediaUrl, type StackContent } from "@/types/content";
```
Change `content: Content["stack"]` to `content: StackContent`.

- [ ] **Step 7: `GuaranteeSection.tsx`**

Change `import type { Content } from "@/types/content";` to:
```ts
import type { GuaranteeContent } from "@/types/content";
```
Change `content: Content["guarantee"]` to `content: GuaranteeContent`.

- [ ] **Step 8: `FAQ.tsx`**

Change `import type { Content } from "@/types/content";` to:
```ts
import type { FaqContent } from "@/types/content";
```
Change `content: Content["faq"]` to `content: FaqContent`.

- [ ] **Step 9: `Hero.tsx`**

Change `import type { Content } from "@/types/content";` to:
```ts
import type { HeroContent, OrderContent } from "@/types/content";
```
Change `{ hero: Content["hero"]; order: Content["order"]; edit?: boolean }` to `{ hero: HeroContent; order: OrderContent; edit?: boolean }`.

- [ ] **Step 10: `Header.tsx`**

Change `import { mediaUrl, type Content } from "@/types/content";` to:
```ts
import { mediaUrl, type HeaderContent } from "@/types/content";
```
Change `content: Content["header"]` to `content: HeaderContent`.

- [ ] **Step 11: `Footer.tsx`**

Change `import { mediaUrl, type Content } from "@/types/content";` to:
```ts
import { mediaUrl, type FooterContent, type HeaderContent } from "@/types/content";
```
Change `content: Content["footer"];` to `content: FooterContent;` and `header: Content["header"];` to `header: HeaderContent;`.

- [ ] **Step 12: `OrderForm.tsx`**

Change `import { mediaUrl, type Content } from "@/types/content";` to:
```ts
import { mediaUrl, type OrderContent } from "@/types/content";
```
Change `content: Content["order"]` to `content: OrderContent`.

- [ ] **Step 13: Type-check — expect GREEN**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 14: Commit**

```bash
git add app/_sections/
git commit -m "refactor(sections): use named content types instead of Content[key]"
```

---

## Task 3: SectionContext + context-aware path resolution

**Files:**
- Create: `app/_editor/SectionContext.tsx`
- Modify: `app/_editor/EditableText.tsx`
- Modify: `app/_editor/MediaSwapButton.tsx`

`SectionContext` carries the `basePath` (e.g. `"sections.1.data"`) of the section currently being rendered. `EditableText` and `MediaSwapButton` prepend it to their `path` prop. **When no context is present (Header/Footer, which stay top-level), behavior is unchanged** — so this task is safe to land before anything uses the context.

- [ ] **Step 1: Create `SectionContext.tsx`**

```tsx
"use client";
import { createContext, useContext } from "react";

export type SectionContextValue = { basePath: string };

const SectionContext = createContext<SectionContextValue | null>(null);

export const SectionContextProvider = SectionContext.Provider;

/**
 * Resolves a section-relative editor path to a draft-absolute path.
 * Inside a section: "h2" -> "sections.4.data.h2".
 * Outside a section (Header/Footer): returned unchanged.
 */
export function useSectionPath(localPath: string): string {
  const ctx = useContext(SectionContext);
  return ctx ? `${ctx.basePath}.${localPath}` : localPath;
}
```

- [ ] **Step 2: Update `EditableText.tsx`**

Add the import after the existing `useEditor` import:
```ts
import { useSectionPath } from "./SectionContext";
```

Inside the component, immediately after `const { state, setField } = useEditor();`, add:
```ts
const fullPath = useSectionPath(path);
```

Then replace every remaining use of `path` *for value resolution and saving* with `fullPath`:
- In the `value` computation, change `path.split(".")` to `fullPath.split(".")`.
- In `onBlur`, change `setField(path, next)` to `setField(fullPath, next)`.

Leave the `path` prop name and the `data-*` attributes as they are; only the two resolution sites change.

- [ ] **Step 3: Update `MediaSwapButton.tsx`**

Add the import after the existing `useEditor` import:
```ts
import { useSectionPath } from "./SectionContext";
```

Inside the component, immediately after `const { setField, state } = useEditor();`, add:
```ts
const fullPath = useSectionPath(path);
```

Then:
- Change the `current` computation `path.split(".")` to `fullPath.split(".")`.
- In the `onSelect` callback, change both `setField(path, ...)` calls to `setField(fullPath, ...)`.

- [ ] **Step 4: Type-check — expect GREEN**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/_editor/SectionContext.tsx app/_editor/EditableText.tsx app/_editor/MediaSwapButton.tsx
git commit -m "feat(editor): section-relative path resolution via SectionContext"
```

---

## Task 4: SectionBody — the shared section switch

**Files:**
- Create: `app/_sections/SectionBody.tsx`

A plain (server-safe, no `"use client"`) component that maps a `Section` to its rendered component. Used by both the public page and the editor. Not yet wired into anything — lands green as dead code.

- [ ] **Step 1: Create `SectionBody.tsx`**

```tsx
import type { Section } from "@/types/content";
import { Headline } from "./Headline";
import { Hero } from "./Hero";
import { LogoStrip } from "./LogoStrip";
import { OnlySystem } from "./OnlySystem";
import { Demo } from "./Demo";
import { Testimonials } from "./Testimonials";
import { Stack } from "./Stack";
import { GuaranteeSection } from "./GuaranteeSection";
import { FAQ } from "./FAQ";

export function SectionBody({ section, edit = false }: { section: Section; edit?: boolean }) {
  switch (section.type) {
    case "headline":
      return <Headline content={section.data.headline} edit={edit} />;
    case "hero":
      return <Hero hero={section.data.hero} order={section.data.order} edit={edit} />;
    case "authority":
      return <LogoStrip content={section.data.authority} edit={edit} />;
    case "onlySystem":
      return <OnlySystem content={section.data.onlySystem} edit={edit} />;
    case "demo":
      return <Demo content={section.data.demo} edit={edit} />;
    case "testimonials":
      return <Testimonials content={section.data.testimonials} edit={edit} />;
    case "stack":
      return <Stack content={section.data.stack} edit={edit} />;
    case "guarantee":
      return <GuaranteeSection content={section.data.guarantee} edit={edit} />;
    case "faq":
      return <FAQ content={section.data.faq} edit={edit} />;
  }
}
```

- [ ] **Step 2: Type-check — expect GREEN**

Run: `npx tsc --noEmit`
Expected: no errors. The `switch` on `section.type` narrows `section.data` per case, so each component gets the exact prop type it declares (from Task 2).

- [ ] **Step 3: Commit**

```bash
git add app/_sections/SectionBody.tsx
git commit -m "feat(sections): add SectionBody switch component"
```

---

## Task 5: Migrate drafts on load + v2 API routes

**Files:**
- Modify: `app/_editor/EditorProvider.tsx`
- Modify: `app/api/draft/route.ts`
- Modify: `app/api/publish/route.ts`

Make the editor and the API routes tolerant of both v1 and v2 inputs by routing everything through `migrateContent`. This still works while `Content` is v1 (a v1 doc migrates to a v2 doc — but `EditorState.draft` is typed `Content` = v1, so we keep these typed loosely until Task 6 repoints `Content`). To avoid a type conflict in this intermediate state, the migrated value is dispatched as-is; `setByPath` and the reducer are shape-agnostic.

> **Note for the implementer:** Tasks 5 and 6 together form the cut-over. Between Task 5's commit and Task 6's commit, `npx tsc --noEmit` may report errors in `EditorProvider.tsx`/`page.tsx` because `migrateContent` returns `ContentV2` while `Content` is still `ContentV1`. That is expected and resolved by Task 6. Do **not** add `as any` casts to paper over it — just proceed to Task 6, which repoints the types. Run the full green check at the end of Task 6.

- [ ] **Step 1: Update `EditorProvider.tsx` — migrate drafts on load**

Add to the imports at the top:
```ts
import { migrateContent } from "@/types/content";
```

In the mount `useEffect` that loads drafts, wrap both draft sources in `migrateContent`:

Replace:
```ts
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") dispatch({ type: "setDraft", draft: parsed });
      }
    } catch { /* ignore */ }
    fetch("/api/draft").then(async (r) => {
      if (!r.ok) return;
      const body = await r.json();
      if (body?.draft) dispatch({ type: "setDraft", draft: body.draft });
    }).catch(() => {});
```

With:
```ts
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          dispatch({ type: "setDraft", draft: migrateContent(parsed) });
        }
      }
    } catch { /* ignore corrupt/incompatible local draft */ }
    fetch("/api/draft").then(async (r) => {
      if (!r.ok) return;
      const body = await r.json();
      if (body?.draft) {
        try {
          dispatch({ type: "setDraft", draft: migrateContent(body.draft) });
        } catch { /* ignore incompatible server draft */ }
      }
    }).catch(() => {});
```

- [ ] **Step 2: Update `app/api/draft/route.ts` — migrate on PUT**

Replace the import:
```ts
import { ContentSchema } from "@/types/content";
```
with:
```ts
import { migrateContent } from "@/types/content";
```

Replace the `PUT` body validation block:
```ts
  const draftCheck = ContentSchema.safeParse(parsed.data.draft);
  if (!draftCheck.success) return NextResponse.json({ error: "Invalid content shape", issues: draftCheck.error.issues }, { status: 400 });
  await saveDraft(draftCheck.data);
  return NextResponse.json({ ok: true });
```
with:
```ts
  let migrated;
  try {
    migrated = migrateContent(parsed.data.draft);
  } catch (e) {
    return NextResponse.json({ error: "Invalid content shape", detail: (e as Error).message }, { status: 400 });
  }
  await saveDraft(migrated);
  return NextResponse.json({ ok: true });
```

- [ ] **Step 3: Update `app/api/publish/route.ts` — migrate draft and current content**

Replace the import:
```ts
import { ContentSchema } from "@/types/content";
```
with:
```ts
import { migrateContent } from "@/types/content";
```

Replace the block from `const parsed = ContentSchema.safeParse(draft);` through the `putFile` call (i.e. lines that validate, read GitHub, compare, and commit) with:

```ts
  let migrated;
  try {
    migrated = migrateContent(draft);
  } catch (e) {
    return NextResponse.json({ error: "Invalid content", detail: (e as Error).message }, { status: 400 });
  }

  let current;
  try {
    current = await getFile("content/content.json");
  } catch (e) {
    return NextResponse.json({ error: "Could not read content.json from GitHub", detail: (e as Error).message }, { status: 502 });
  }

  let currentMigrated = null;
  try {
    currentMigrated = migrateContent(current.content);
  } catch { /* current file unreadable as content — treat as changed */ }

  if (currentMigrated && JSON.stringify(currentMigrated) === JSON.stringify(migrated)) {
    await deleteDraft();
    return NextResponse.json({ ok: true, noop: true });
  }

  try {
    const r = await putFile({
      path: "content/content.json",
      content: migrated,
      sha: current.sha,
      message: `content: ${session.sub} edit (${new Date().toISOString().slice(0, 10)})`,
    });
    await deleteDraft();
    return NextResponse.json({ ok: true, commit_sha: r.commitSha });
  } catch (e) {
    return NextResponse.json({ error: "GitHub commit failed", detail: (e as Error).message }, { status: 502 });
  }
```

- [ ] **Step 4: Commit**

```bash
git add app/_editor/EditorProvider.tsx app/api/draft/route.ts app/api/publish/route.ts
git commit -m "feat(editor): migrate drafts and published content through migrateContent"
```

---

## Task 6: Cut over to v2 — repoint Content, render from sections

**Files:**
- Modify: `types/content.ts`
- Modify: `app/page.tsx`
- Modify: `app/_editor/LandingTree.tsx`
- Modify: `tests/lib/content.test.ts`

This is the atomic cut-over: `Content` becomes v2, and both render paths map over `sections`.

- [ ] **Step 1: Repoint `ContentSchema` / `Content` to v2 in `types/content.ts`**

Replace:
```ts
export const ContentSchema = ContentSchemaV1;
export type Content = ContentV1;
```
with:
```ts
export const ContentSchema = ContentSchemaV2;
export type Content = ContentV2;
```

- [ ] **Step 2: Rewrite `app/page.tsx`**

Replace the entire file with:

```tsx
import { headers } from "next/headers";
import contentJson from "@/content/content.json";
import { migrateContent, findSection, mediaUrl } from "@/types/content";
import { JsonLd } from "./_sections/JsonLd";
import { Header } from "./_sections/Header";
import { Footer } from "./_sections/Footer";
import { SectionBody } from "./_sections/SectionBody";
import { EditorProvider } from "./_editor/EditorProvider";
import { LandingTree } from "./_editor/LandingTree";

export default async function Home() {
  const h = await headers();
  const editMode = h.get("x-adv-edit-mode") === "1";
  const c = migrateContent(contentJson);

  const hero = findSection(c, "hero");
  const faq = findSection(c, "faq");

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: c.meta.productName,
    brand: { "@type": "Brand", name: c.meta.brand },
    description: c.meta.description,
    image: mediaUrl(c.meta.ogImage),
    aggregateRating: { "@type": "AggregateRating", ratingValue: "4.9", reviewCount: "456" },
    offers: {
      "@type": "Offer",
      price: (hero?.data.order.priceNow ?? "").replace(/[^\d.]/g, ""),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: c.meta.canonical,
    },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: (faq?.data.faq.items ?? []).map((q) => ({
      "@type": "Question",
      name: q.q,
      acceptedAnswer: { "@type": "Answer", text: q.a },
    })),
  };

  if (editMode) {
    return (
      <>
        <JsonLd data={productJsonLd} />
        <JsonLd data={faqJsonLd} />
        <EditorProvider initial={c}>
          <LandingTree />
        </EditorProvider>
      </>
    );
  }

  return (
    <>
      <JsonLd data={productJsonLd} />
      <JsonLd data={faqJsonLd} />
      <Header content={c.header} />
      <main id="main">
        {c.sections
          .filter((s) => !s.hidden)
          .map((s) => (
            <SectionBody key={s.id} section={s} />
          ))}
      </main>
      <Footer content={c.footer} header={c.header} />
    </>
  );
}
```

- [ ] **Step 3: Rewrite `app/_editor/LandingTree.tsx`**

Replace the entire file with:

```tsx
"use client";
import { useEditor } from "./EditorProvider";
import { ToastProvider } from "../_components/Toast";
import { Header } from "../_sections/Header";
import { Footer } from "../_sections/Footer";
import { SectionBody } from "../_sections/SectionBody";
import { SectionContextProvider } from "./SectionContext";
import { PublishBar } from "./PublishBar";

export function LandingTree() {
  const { state } = useEditor();
  const c = state.draft;
  return (
    <ToastProvider>
      <PublishBar />
      <Header content={c.header} edit />
      <main id="main">
        {c.sections.map((s, i) => (
          <SectionContextProvider key={s.id} value={{ basePath: `sections.${i}.data` }}>
            <SectionBody section={s} edit />
          </SectionContextProvider>
        ))}
      </main>
      <Footer content={c.footer} header={c.header} edit />
    </ToastProvider>
  );
}
```

- [ ] **Step 4: Update `tests/lib/content.test.ts`**

Replace the entire file with:

```ts
import { describe, it, expect } from "vitest";
import { ContentSchema, migrateContent } from "@/types/content";
import contentJson from "@/content/content.json";

describe("ContentSchema", () => {
  it("parses content.json (after migration) successfully", () => {
    const migrated = migrateContent(contentJson);
    const result = ContentSchema.safeParse(migrated);
    if (!result.success) console.error(result.error.issues);
    expect(result.success).toBe(true);
  });

  it("rejects content missing required fields", () => {
    const bad = { meta: { title: "x" } };
    expect(ContentSchema.safeParse(bad).success).toBe(false);
  });
});
```

- [ ] **Step 5: Type-check — expect GREEN**

Run: `npx tsc --noEmit`
Expected: no errors anywhere. `EditorState.draft` is now `Content` = v2; `migrateContent` returns `ContentV2`; `EditorProvider`'s `initial={c}` and `setDraft` dispatches now type-match.

- [ ] **Step 6: Run the full test suite — expect GREEN**

Run: `npm test`
Expected: all tests pass, including `content.test.ts` and `migrate-content.test.ts`.

- [ ] **Step 7: Production build — expect SUCCESS**

Run: `npm run build`
Expected: build completes with no errors.

- [ ] **Step 8: Commit**

```bash
git add types/content.ts app/page.tsx app/_editor/LandingTree.tsx tests/lib/content.test.ts
git commit -m "feat(content): cut over to v2 section-list model for rendering"
```

---

## Task 7: Manual rendering-parity verification

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Verify the public page is unchanged**

Open `http://localhost:3000/`. Confirm visually, top to bottom: Header, Headline, Hero (with order form on the side), LogoStrip, OnlySystem, Demo, Testimonials, Stack, Guarantee, FAQ, Footer — all render in the same order with the same content as before this branch. Check the page source contains both JSON-LD `<script>` blocks (Product + FAQPage) with populated values.

- [ ] **Step 3: Verify the editor still works**

Open the landing in edit mode (the admin entrypoint that sets the `x-adv-edit-mode` header — see `middleware.ts`). Confirm:
  - Every section renders identically to the public page.
  - Clicking a text field makes it editable; editing it and clicking away updates the text and marks the draft dirty (PublishBar shows unsaved state).
  - The "Change" button on a media element (Hero video, Demo video, Stack image, a video testimonial) opens the upload modal and selecting a new URL updates that media.
  - Reload the page — the debounced draft (after ~5s) or localStorage draft restores the edit.

- [ ] **Step 4: Report**

If anything renders differently from `main`, stop and report the discrepancy. If all parity checks pass, Phase 1 is complete — the data model is v2, migration is in place, and rendering is unchanged. Phases 2–4 (structure sidebar, in-place media, list reordering) build on this foundation.

---

## Self-Review Notes

- **Spec coverage:** This plan covers the spec's "Data model (v2)", "Migration", "Save / publish", and "Rendering" sections, plus the "Testing" section's migration + parity checks. The spec's "Editor UX (hybrid)", "Media handling", and "Lists" sections are explicitly deferred to Phases 2–4 and are *not* in scope here — Phase 1 is the foundational data-model cut-over only.
- **Intermediate type state:** Tasks 5→6 are a deliberate two-commit cut-over. Task 5's commit may not fully type-check on its own (documented inline in Task 5); Task 6 closes it. This was chosen over one giant task to keep each commit's *blast radius* reviewable.
- **Type consistency:** `migrateContent` returns `ContentV2`; `findSection` takes `ContentV2`; section-data bag keys (`headline`, `hero`+`order`, `authority`, `onlySystem`, `demo`, `testimonials`, `stack`, `guarantee`, `faq`) match the `path` prefixes already used inside the section components, which is what makes `SectionContext` path resolution work with zero changes to component `path` props.
