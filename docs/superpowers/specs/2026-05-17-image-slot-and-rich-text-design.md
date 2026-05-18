# Order-box image slot + badge fix + rich-text formatting

**Date:** 2026-05-17
**Status:** Approved design — ready for implementation plan
**Scope:** Three related landing-editor improvements bundled into one spec but executed as three sequential, independent features:

- **A.** Add an optional image slot inside the order box, between the `badge` strip and the `productName`.
- **B.** Verify (and fix if broken) that the `order.badge` text is editable from the admin landing editor.
- **C.** Add inline text formatting (bold, italic, underline, color) to a curated subset of editable fields, exposed via a new `EditableRichText` component.

## Goal

Give the editor enough control to (1) drop a product image into the order box without a developer change, (2) reliably edit the "NOW AVAILABLE…" strip, and (3) format key headlines and paragraphs with bold / italic / underline / one of 12 brand colors. The three improvements ship as separate commits to keep regressions easy to bisect.

## Non-goals

- **Freeform image placement.** Only ONE new image slot is added (in the order box). Other section-specific image slots are out of scope and would each be a separate feature.
- **Link / alignment / lists / headings / font-size in the rich-text editor.** Strict MVP scope: B / I / U / color only.
- **Arbitrary color picker.** Palette is a hardcoded list of 12 brand-aligned colors. Users cannot pick a custom hex.
- **Promoting every existing `EditableText` to `EditableRichText`.** ~20 fields are migrated explicitly; everything else (buttons, prices, item names, labels, prices, etc.) stays plain text.
- **Rich-text editing in `RepeatableList` items** (e.g. FAQ answers, stack item bodies, testimonial quotes). v1 scope is the main page-level headlines and paragraphs; list items can be added in a follow-up if needed.
- **Third-party rich-text library** (TipTap, Lexical, Slate). Native `contentEditable` + Selection API only, no new dependency.
- **`document.execCommand`.** Deprecated; we manage the selection manually.
- **WYSIWYG color preview while typing.** Color applies only to highlighted selections at save time, like Notion's text formatting.
- **Backwards-incompatible storage migrations.** Plain-text strings remain valid input to the rich-text fields (they render identically — plain text is valid HTML).

## Architecture overview

```
Feature A (image slot)                Feature B (badge fix)         Feature C (rich text)
─────────────────────                ─────────────────────         ─────────────────────
order.image: MediaRef?               investigate click target      lib/richtext/
       │                             on .ac-order__strip in            ├── EditableRichText.tsx
       ▼                             admin mode; fix CSS or            ├── RichTextToolbar.tsx
OrderForm.tsx                        z-index if needed.                ├── sanitize.ts
   ├── <img> (public + admin)                                          ├── selection.ts
   └── <MediaSlot path="order.image" compact />                        └── palette.ts
                                                                       │
                                                                       ▼
                                                                   types/content.ts
                                                                       │ (~20 fields become
                                                                       │  HTML strings)
                                                                       ▼
                                                                   ~12 section components
                                                                       │ (swap Edit -> EditRich)
                                                                       ▼
                                                                   Public render: HTML inserted via
                                                                     a sanitized HTML host (see below)
                                                                   Publish: sanitize before commit
```

The three features touch disjoint files except for `OrderForm.tsx` (A inserts an image; C swaps the badge from `<Edit>` to a rich-text variant). Sequencing A -> B -> C avoids merge friction.

---

## Feature A — Image slot in the order box

### Data model

Extend `OrderSchema` in [types/content.ts:60](types/content.ts#L60):

```ts
export const OrderSchema = z.object({
  badge: z.string(),
  productName: z.string(),
  productSubtitle: z.string(),
  image: MediaRefSchema.optional(),
  // ...rest unchanged
});
```

`MediaRefSchema` already exists in the file and supports `{ url, alt }`. No content.json migration needed — the field is optional and existing pages render without it.

### JSX placement

In [OrderForm.tsx](app/_sections/OrderForm.tsx), between `<div className="ac-order__strip">` (badge wrapper, line 28-30) and `<div className="ac-order__product">` (product name wrapper, line 32):

```tsx
<div className="ac-order__strip">
  <Edit edit={edit} path="order.badge">{order.badge}</Edit>
</div>
{(order.image?.url || edit) && (
  <div className="ac-order__image" style={{ position: "relative" }}>
    {order.image?.url && (
      <img
        src={mediaUrl(order.image.url)}
        alt={order.image.alt ?? ""}
        className="ac-order__image-img"
      />
    )}
    {edit && <MediaSlot path="order.image" accept="image" compact />}
  </div>
)}
<div className="ac-order__product">
  ...
</div>
```

Public visitors without an image set see nothing (the block is conditionally not rendered). Admins always see at least the `MediaSlot` corner button so they can upload one.

### CSS

Add two rules to [styles/landing.css](styles/landing.css), grouped with the other `.ac-order__*` rules:

```css
.ac-order__image {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 12px 0 8px;
  min-height: 60px; /* gives the empty admin slot a clickable surface */
}
.ac-order__image-img {
  max-width: 100%;
  max-height: 180px;
  height: auto;
  object-fit: contain;
  border-radius: 8px;
}
```

180px max-height is a sensible default for product imagery in this box width. Adjust later if needed.

### Acceptance

- Public landing without `order.image`: visually identical to today.
- Public landing with `order.image`: an image appears between the strip and the product name, centered, max 180px tall.
- Admin without image: empty slot with a "Change" / pencil button to upload.
- Admin with image: image renders, with `MediaSlot` button to replace, drag-and-drop works, alt text editable through the existing flow.

---

## Feature B — Badge editability check

### Investigation

In admin mode (`?edit=true` or via the admin toggle), click directly on the text "NOW AVAILABLE FOR INSTANT DIGITAL DOWNLOAD" inside `.ac-order__strip`. Expected: `contentEditable` activates, caret appears, text becomes editable.

Likely culprits if it doesn't work:
1. `.ac-order__strip` has `pointer-events: none` or `user-select: none` in [styles/landing.css](styles/landing.css)
2. A `::before` / `::after` pseudo-element overlays the text and intercepts clicks
3. `z-index` issue — another element sits above

### Fix (if applicable)

Whatever the cause, the fix is scoped to [styles/landing.css](styles/landing.css). Examples:
- Add `pointer-events: auto` to the inner span that wraps the badge text.
- If a pseudo-element overlays, add `pointer-events: none` to that pseudo-element so clicks fall through to the editable text underneath.

### Acceptance

- Click on the badge text in admin mode -> contentEditable engages, edits persist via the existing autosave.
- If verification shows the bug doesn't exist, this feature ships as a no-op (just a logged confirmation in the commit message).

---

## Feature C — Inline rich-text formatting

### Feature set (strict)

Four formats only:
- **Bold** -> `<strong>...</strong>`
- **Italic** -> `<em>...</em>`
- **Underline** -> `<u>...</u>`
- **Color** -> `<span style="color:#hex">...</span>`

### Color palette

12 curated colors, organized in a 4-column × 3-row grid in the toolbar popover. Built from existing CSS tokens in [styles/colors_and_type.css](styles/colors_and_type.css) to maintain visual coherence with the rest of the site:

| # | Label | Hex | Source token |
|---|---|---|---|
| 1 | Black | `#140c0c` | `--color-text-primary` |
| 2 | Dark navy | `#061130` | `--color-text-deep-navy` |
| 3 | Navy | `#233567` | `--color-text-navy-2` |
| 4 | Gray | `#394976` | `--color-text-muted` |
| 5 | Light gray | `#6d6d6d` | `--color-text-light` |
| 6 | White | `#ffffff` | `--color-text-inverse` |
| 7 | Brand blue | `#1c7fff` | `--color-brand-blue` |
| 8 | Deep blue | `#1945e0` | `--color-brand-blue-deep` |
| 9 | Success green | `#38d25a` | `--color-success` |
| 10 | Danger red | `#ff0000` | `--color-danger` |
| 11 | Coral red | `#ec274a` | `--color-danger-2` |
| 12 | Warning yellow | `#ffce1e` | `--color-warning` |

A 13th "Clear color" option (no swatch — just an "x" cell or "Default" link) removes any color span around the selection.

Stored as the hex literal (not the CSS variable name) so the saved HTML is portable and not dependent on the page's CSS variables being available.

### Data model

The ~20 migrated fields stay typed as `z.string()` in the Zod schema — HTML is a string. No schema change is structurally required for the migration; the meaning of the string just becomes "sanitized HTML" rather than "plain text". Backwards-compatible: an existing plain-text value renders identically (plain text IS valid HTML).

A short JSDoc comment on each migrated field in [types/content.ts](types/content.ts) marks its semantic change:

```ts
/** Rich text (HTML). Allowed tags: strong, em, u, span[style=color]. */
h1: z.string(),
```

### Component split

`EditableText` (existing, [app/_editor/EditableText.tsx](app/_editor/EditableText.tsx)) stays unchanged — plain text only. Used for buttons, prices, labels, item names, prices, etc.

New component `EditableRichText` lives in [app/_editor/EditableRichText.tsx](app/_editor/EditableRichText.tsx). Same API surface as `EditableText` (`path`, `as`, `className`, `multiline`) plus internally it manages the HTML round-trip and renders the floating toolbar on selection.

A matching wrapper `<EditRich edit={edit} path="...">{value}</EditRich>` mirrors the existing `<Edit>` helper for symmetry.

### Public rendering of HTML

Public-page renderers need to inject the saved HTML into the DOM. We use React's `dangerouslySetInnerHTML` on a sanitized string. The "dangerous" name reflects React's correct caution; in this design the danger is bounded because:

1. **Single trusted writer.** Only the JWT-authenticated admin can write these fields (via `/api/draft` and `/api/publish`).
2. **Publish-time sanitization.** Before any HTML reaches `content.json` / git / the production page, it passes through `lib/richtext/sanitize.ts` (see spec below) which strips everything outside an allowlist of 5 tags and 1 attribute pattern.
3. **No third-party content.** Field values are never sourced from API responses, user submissions, or external data.

This is the minimum-risk path for storing rich text without a third-party dep. If a future requirement allows untrusted writers (multi-tenant CMS, public comments, etc.), we'd swap to DOMPurify before render — but the current scope is single-admin, so the lightweight allowlist parser is sufficient.

### Sanitization (publish-time)

When the user clicks Publish ([app/api/publish/route.ts](app/api/publish/route.ts)), every migrated field is run through a small sanitizer before being committed to git. The sanitizer:
- Allows only `<strong>`, `<em>`, `<u>`, `<br>`, and `<span style="color:#XXXXXX">` (where `#XXXXXX` matches the palette regex)
- Strips every other tag (keeping inner text)
- Strips every other attribute (keeping inner text)
- Strips `style` attributes that don't match the color regex

Lives in `lib/richtext/sanitize.ts`. No external dependency — a small allowlist parser. Unit-tested with 10+ cases (script injection, nested tags, malformed input, unicode, empty input, etc.).

The draft layer (`/api/draft`) does NOT sanitize — that runs only at publish, so the editor sees exactly what they typed in case of a mistake. Sanitization at publish protects the live page.

### Selection-based editor mechanics

`contentEditable=true` on the editable host element. When the user selects a range of text and the toolbar's "B" button is clicked:

1. Grab the current `Selection` and its `Range`.
2. Build the wrapping element (`<strong>`, `<em>`, etc.).
3. Use `range.surroundContents(wrapper)` if the range is simple; if it crosses element boundaries (e.g., partly inside an existing `<em>`), split the range at the boundaries and apply the wrapper to each fragment.
4. Toggle behavior: if the entire selection is ALREADY wrapped by the format, unwrap it instead.
5. After wrapping, re-collect `innerHTML` and dispatch to the editor state via `setField(path, sanitized.html)`.
6. Selection is preserved post-mutation by re-anchoring at the original offsets.

For color, the wrapper is `<span style="color:#HEX">` with the chosen hex from the palette.

For each format, the toolbar button shows an "active" state if the current selection is fully inside an existing tag of that type — implemented by walking from the selection's common ancestor up the DOM and checking tag names.

Helper functions for this logic live in `lib/richtext/selection.ts`. Pure functions over a `Range` + `Element` root, unit-testable.

### Toolbar UI

A floating div positioned above the selection when text is highlighted inside an `EditableRichText` host. Hidden when the selection collapses or focus leaves.

```
+------------------------------+
|  B   I   U   color           |
+------------------------------+
```

Click the color button -> swap the toolbar to a color grid:

```
+------------------------------+
|  o  o  o  o                  |
|  o  o  o  o                  |
|  o  o  o  o                  |
|  ------------                |
|  x  Clear color              |
+------------------------------+
```

12 swatches as small colored circles (24x24px). Click a swatch -> applies. Click "x" -> removes color.

Implementation in `app/_editor/RichTextToolbar.tsx`. Positioned with `getBoundingClientRect` on the selection range, clamped to the viewport.

### Fields migrated to `EditableRichText` (v1)

23 fields exactly. Everything else stays `EditableText`.

**Headlines / titles** (8):
- `headline.eyebrow`, `headline.h1`, `headline.sub`
- `hero.sectionTitle`, `hero.sectionBody`
- `onlySystem.eyebrow`, `onlySystem.h2`, `onlySystem.body`

**Other section h2s + paragraphs** (9):
- `faq.h2`, `faq.sub`
- `demo.h2`
- `guarantee.h2`, `guarantee.body`
- `stack.h2`, `stack.guaranteeText`
- `testimonials.h2`, `testimonials.pullQuote`

**Order box body** (5):
- `order.badge`, `order.productName`, `order.productSubtitle`, `order.description`, `order.guaranteeText`

**Footer** (1):
- `footer.disclaimer`

Explicitly NOT migrated (stays plain text):
- All buttons / CTAs / prices / labels / names / roles / item titles inside lists / phone numbers / logos / copyrights / video labels / FAQ questions and answers / stack items / testimonial quotes (inside RepeatableLists)

(Adding more later is purely additive — switching one more field from `<Edit>` to `<EditRich>` is a one-line change.)

### Sanitization spec (machine-readable allowlist)

```ts
const ALLOWED_TAGS = new Set(["strong", "em", "u", "br", "span"]);
const ALLOWED_ATTRS_BY_TAG: Record<string, Set<string>> = {
  span: new Set(["style"]),
};
const COLOR_STYLE_RE = /^color:\s*#[0-9a-fA-F]{6}\s*;?\s*$/;
```

Color values are additionally checked against the palette set (to reject hex values not in our 12 colors — defense in depth).

### Acceptance

- Plain-text strings in current `content.json` render identically before AND after C ships.
- Highlight text in an `EditableRichText` field -> toolbar appears above the selection.
- Click B/I/U -> format toggles on/off; visible in editor immediately.
- Click the color button -> swatch grid; pick a color -> selection takes the color.
- Click outside or press Escape -> toolbar hides.
- Edit a plain `<EditableText>` field (e.g. CTA label) -> no toolbar appears.
- Publish -> page renders the formatted HTML on the public landing.
- Hand-edit `content.json` to inject `<script>` -> publish strips it; page is safe.

---

## Error handling

| Surface | Bad input | Behaviour |
|---|---|---|
| Rich-text editor | Paste rich content from another site | Sanitizer strips disallowed tags at paste-time (`onPaste` handler converts to plain text first, then user formats manually) |
| Rich-text editor | Selection across element boundaries | Selection is split and the format applied to each fragment |
| Rich-text editor | User presses Enter in single-line field | Inserts nothing (Enter prevented); field stays single-line |
| Publish | Field contains tags outside allowlist | Sanitizer strips them; inner text preserved |
| Publish | Field contains color hex not in palette | Color span is removed; inner text preserved |
| Image slot | User uploads a 50MB image | Existing `useMediaUpload` size limit applies (no change here) |
| Image slot | User clears the image | Setting `order.image` to `undefined` removes the rendered img on next publish |
| Badge fix | Click still doesn't activate edit after CSS fix | Surface a visible error in the admin debug log (or document the regression for follow-up) |

---

## Testing

- **A.** Manual browser smoke test (public render with/without image; admin upload & replace).
- **B.** Manual browser smoke test (click badge in admin -> contentEditable engages).
- **C.**
  - `tests/lib/richtext/sanitize.test.ts` (new): 10+ cases — script injection, nested allowed tags, disallowed attrs, color regex matching, palette mismatch, empty input, plain-text passthrough.
  - `tests/lib/richtext/selection.test.ts` (new): simple-range wrap, nested wrap, toggle-off detection, color application, selection re-anchoring.
  - Component tests for `RichTextToolbar` deferred to manual browser testing — same rationale as the clinic-type feature.

---

## Files touched

**New:**
- `lib/richtext/sanitize.ts`
- `lib/richtext/selection.ts`
- `lib/richtext/palette.ts`
- `app/_editor/EditableRichText.tsx`
- `app/_editor/EditRich.tsx` (thin wrapper mirroring `<Edit>`)
- `app/_editor/RichTextToolbar.tsx`
- `tests/lib/richtext/sanitize.test.ts`
- `tests/lib/richtext/selection.test.ts`

**Modified (A):**
- `types/content.ts` (OrderSchema: `image?` field)
- `app/_sections/OrderForm.tsx` (image block insertion)
- `styles/landing.css` (`.ac-order__image*` rules)

**Modified (B):**
- `styles/landing.css` (only if a CSS click-blocking bug is found)

**Modified (C):**
- `types/content.ts` (JSDoc comment on each migrated field; no Zod change)
- `app/api/publish/route.ts` (call sanitizer on migrated fields before git commit)
- `app/_sections/Hero.tsx`, `Headline.tsx`, `OnlySystem.tsx`, `FAQ.tsx`, `Demo.tsx`, `GuaranteeSection.tsx`, `Stack.tsx`, `Testimonials.tsx`, `Footer.tsx`, `OrderForm.tsx` (swap relevant `<Edit>` to `<EditRich>`)

---

## Build order (will become the implementation plan ordering)

1. **A.1** Schema + JSX + CSS for `order.image`
2. **A.2** Manual verify image slot end-to-end
3. **B.1** Investigate + fix badge click in admin (or confirm not broken)
4. **C.1** Palette module (`lib/richtext/palette.ts`)
5. **C.2** Sanitizer + tests (`lib/richtext/sanitize.ts` + `tests/lib/richtext/sanitize.test.ts`)
6. **C.3** Selection helpers + tests (`lib/richtext/selection.ts` + tests)
7. **C.4** `EditableRichText` component + `<EditRich>` wrapper
8. **C.5** `RichTextToolbar` component (B/I/U + color swatches)
9. **C.6** Hook sanitizer into `/api/publish` POST
10. **C.7** Migrate `order.badge`, `order.productName`, `order.description`, `order.guaranteeText`, `order.productSubtitle` (5 fields, single file)
11. **C.8** Migrate headlines (`headline.*`, `hero.sectionTitle`, `hero.sectionBody`) (5 fields, 2 files)
12. **C.9** Migrate `onlySystem.*` text fields (3 fields, 1 file)
13. **C.10** Migrate `faq.*`, `demo.h2`, `guarantee.*`, `stack.h2`/`stack.guaranteeText`, `testimonials.h2`/`testimonials.pullQuote`, `footer.disclaimer` (remaining 10 fields)
14. **C.11** Full smoke test + typecheck + test suite + build

Each task is its own commit.

---

## Backlog (out of scope, future work)

Captured here so they don't reappear in the next conversation:

- Migrate FAQ answers / stack item bodies / testimonial quotes to rich text (extend C scope)
- Add hyperlinks to the rich-text format set
- Alignment (left / center / right)
- Lists (bullet / numbered)
- Heading levels (H1 / H2 / H3) within a block
- Arbitrary color picker
- Per-section image slots beyond the order box
- Section spacing control (from earlier backlog)
- Hide/restore for individual texts (from earlier backlog)
- Video upload bug fix (from earlier backlog)
- New section types (from earlier backlog)
