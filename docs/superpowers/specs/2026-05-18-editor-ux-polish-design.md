# Editor UX polish — MediaSlot empty state, CTA editability, badge verification

**Date:** 2026-05-18
**Status:** Approved design — ready for implementation plan
**Scope:** Three small, complementary fixes that unblock the admin editor experience after the first user-facing test of the rich-text + image-slot feature exposed three frustrations:

- **A.** `MediaSlot` is invisible / hard to discover when no image is set.
- **B.** CTA buttons (`order.ctaTagline`, `order.ctaLabel`) are wrapped in `<Edit>` but the surrounding `<button>` element swallows interactions, so the contentEditable text inside is unreachable.
- **C.** `order.badge` ("NOW AVAILABLE FOR INSTANT DIGITAL DOWNLOAD") was migrated to `EditRich` in the previous chantier but the user reports it still isn't editable in production.

This chantier is the first of three (I → III → II) decomposed from the user's post-deployment feedback session.

## Goal

Make every text/image field on the landing page reliably editable in admin mode, with clear visual affordances. After this ships, every editable target should have either (a) a visible contentEditable surface that responds to a single click, or (b) a visible "upload here" dropzone for media.

## Non-goals

- **Replacing decorative graphics** (the GuaranteeBadge stars in OnlySystem / Stack / GuaranteeSection, the 5 review stars in OrderForm) with MediaSlots. That is Chantier II — separate spec.
- **Section background colors.** Chantier III.
- **Reworking MediaSlot internals** (popover layout, alt-text editor, library picker). Only the trigger/visible UI changes.
- **Touching the `compact` MediaSlot variant** used for the header favicon. It stays as-is — the small slot makes sense for a tiny element where a 120px dropzone would be disproportionate.
- **Restyling button visuals.** The CTA fix is purely structural (DIV vs BUTTON in edit mode). The painted appearance stays identical.
- **Multiple media slots per container** or any extension of MediaSlot's capabilities.

## Architecture overview

```
Feature A: MediaSlot                Feature B: CTA            Feature C: badge verification
─────────────────────              ────────────────────       ──────────────────────────────
MediaSlot.tsx                      CTA.tsx                   smoke-test in browser; if broken,
   ├── empty branch ─→ dropzone        ├── edit?: boolean          inspect styles/landing.css
   │                  120×min            ├── if edit:                  for click-blocking rules
   │                  dashed border      │   render <div role>         on .ac-order__strip
   │                                     └── else render <button>      and fix in place.
   └── filled branch ─→ image
                       + hover-overlay
                          with centered "Change" button

OrderForm.tsx passes `edit` to CTA
```

A, B and C are independent and can be commits in any order. The recommended sequence is A → B → C because A is the visual fix the user notices first, B is the most code-isolated, and C is investigatory (may or may not require a fix).

---

## Feature A — MediaSlot empty-state dropzone + filled-state hover overlay

### Current behaviour

`MediaSlot` is rendered as a small corner "Change" pill button (or a 22×22 icon-only pill when `compact`). It overlays whatever container the parent draws. In its **empty** state (no image set in `content.json`), the parent typically draws a near-empty container — see `.ac-order__image { min-height: 60px }` — and the pill is the only visible UI. Users miss it.

In its **filled** state, the image renders and the corner pill is technically visible but easy to overlook.

### New behaviour

`MediaSlot` becomes self-aware of its empty/filled state and renders differently:

- **Empty + not compact** → render a **dropzone block** instead of a corner pill. Centered icon (image SVG, 32×32) + text "Click or drop an image" (font: 500 13px). Dashed `2px` border in `var(--color-brand-blue)` with 8px radius and 8px padding. Background `rgba(28, 127, 255, 0.04)`. Min-height `120px`. The whole block is the click target (opens the popover) and the drop target (accepts file drag).
- **Empty + compact** → keep the existing corner pill (the favicon use case — a 22×22 dropzone would be absurd).
- **Filled (any compact mode)** → keep the corner pill as today, BUT add a hover-overlay on the parent container:
  - Default: image visible, pill in corner (semi-transparent).
  - Parent container `:hover` triggers a full-image overlay: `rgba(0, 0, 0, 0.4)` background covering the image area, with a larger centered "Change" button (the pill rendered at 2× the current size).
  - 150ms ease-in-out opacity transition.

### Detecting empty vs filled

`MediaSlot` already reads `current` via `useEditor().state.draft`. The new branch:

```ts
const isEmpty = !mediaUrl(current as MediaRef | null | undefined);
```

Where `mediaUrl` is the existing helper from `types/content.ts` (handles both string and `{url, alt}` shapes).

### How the hover-overlay works structurally

The overlay is a new sibling of the corner pill inside MediaSlot's React fragment. It's `position: absolute; inset: 0` so it covers the entire parent container's bounding box. **Hover detection happens in JS via React state** (not CSS) — this avoids fragile cross-container CSS selectors and works regardless of the parent's class name.

The existing "drop overlay" div in MediaSlot (lines 196-220) is already absolutely-positioned with `inset: 0` and listens to window-level drag events. We extend it to also own hover state:

```tsx
const [hovered, setHovered] = useState(false);
// ...
<div
  onMouseEnter={() => setHovered(true)}
  onMouseLeave={() => setHovered(false)}
  onDragOver={(e) => e.preventDefault()}
  onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFile(e.dataTransfer.files?.[0]); }}
  style={{
    position: "absolute",
    inset: 0,
    zIndex: 9,
    pointerEvents: dragActive ? "auto" : "auto", // always interactive in admin so hover works
    background: dragActive ? "rgba(28,123,253,0.12)" : hovered ? "rgba(0,0,0,0.4)" : "transparent",
    border: dragActive ? "2px dashed #1c7bfd" : "2px dashed transparent",
    transition: "background 150ms ease-in-out",
    display: "grid",
    placeItems: "center",
    /* ... */
  }}
>
  {hovered && !dragActive && (
    <button onClick={() => { setOpen(true); setView("menu"); }} style={overlayBtnStyle}>
      <Icons.Pencil /> Change
    </button>
  )}
  {dragActive && `Drop to replace this ${accept}`}
</div>
```

Notes:
- `pointerEvents: "auto"` is now permanent in admin (vs `dragActive ? "auto" : "none"` previously). This means the overlay receives hover events. Click on the overlay opens the popover (same as the corner pill).
- The existing corner pill is kept as a redundant always-visible trigger in filled state. In empty state (next section), the pill is hidden and the overlay area transforms into the dropzone visual.
- No `:has()` or cross-container CSS — pure JS state. Browser support is not a concern.

### Visual mockup (text)

```
Empty state (admin, container without image):
┌─────────────────────────────────────┐
│  ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌  │
│  ╎                               ╎  │
│  ╎    [image-icon-24x24]         ╎  │
│  ╎    Click or drop an image     ╎  │
│  ╎                               ╎  │
│  ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌  │
└─────────────────────────────────────┘

Filled state, default:
┌─────────────────────────────────────┐
│  [actual image]              [Change pill]
│                                     │
│                                     │
└─────────────────────────────────────┘

Filled state, on hover:
┌─────────────────────────────────────┐
│  [actual image with dark overlay]   │
│             ╭─────────────╮         │
│             │   Change    │         │
│             ╰─────────────╯         │
└─────────────────────────────────────┘
```

### Drop handling

The existing window-level drag detection in `MediaSlot` stays. Both the dropzone (empty state) and the hover-overlay (filled state) accept dropped files. The visual treatment of the drop-active state stays the same (blue dashed border + tint).

### Acceptance

- Admin mode, container without image → big dashed dropzone with "Click or drop an image" visible.
- Click dropzone → opens existing upload popover.
- Drop file on dropzone → uploads (same flow as today).
- Admin mode, container with image → image visible, small pill in corner. Mouse hover on image → semi-dark overlay with centered "Change" button.
- `compact` variant unchanged (favicon).
- Public render: zero change (MediaSlot is `if (state.previewMode) return null` and is conditionally rendered only when `edit` is true in parents).

---

## Feature B — CTA editability in admin mode

### Current behaviour

`<CTA>` in `app/_sections/_shared/CTA.tsx` renders:

```tsx
<button
  className={`ac-cta ${compact ? "ac-cta--compact" : ""}`}
  type={type}
  onClick={onClick}
  aria-label={ariaLabel || ariaFallback}
>
  {tag && <span className="ac-cta__tag">{tag}</span>}
  <span className="ac-cta__label">{label}<span className="ac-cta__arrow"><Icons.ArrowRight/></span></span>
</button>
```

`tag` and `label` may be `<Edit>` wrappers (which conditionally render `<EditableText>` in admin). Despite `type="button"` in admin mode (preventing form submit), the surrounding `<button>` swallows enough interaction that `contentEditable` inside doesn't activate reliably in all browsers. Confirmed problem on the live site.

### New behaviour

Add an `edit?: boolean` prop to `<CTA>`. When `edit === true`, render as a `<div role="button">` instead of `<button>`:

```tsx
export function CTA({
  tag, label, compact = false, ariaLabel, onClick, type = "button", edit = false,
}: { /* ...existing... */; edit?: boolean }) {
  if (edit) {
    return (
      <div
        className={`ac-cta ${compact ? "ac-cta--compact" : ""}`}
        role="button"
        aria-label={ariaLabel || (typeof label === "string" ? label : undefined)}
      >
        {tag && <span className="ac-cta__tag">{tag}</span>}
        <span className="ac-cta__label">{label}<span className="ac-cta__arrow"><Icons.ArrowRight/></span></span>
      </div>
    );
  }
  // existing implementation unchanged
  return (
    <button className={`ac-cta ${compact ? "ac-cta--compact" : ""}`} type={type} onClick={onClick} aria-label={ariaLabel || (typeof label === "string" ? label : undefined)}>
      {tag && <span className="ac-cta__tag">{tag}</span>}
      <span className="ac-cta__label">{label}<span className="ac-cta__arrow"><Icons.ArrowRight/></span></span>
    </button>
  );
}
```

Identical class names → identical visual appearance. The `role="button"` keeps the element accessible-button-like for screen readers in admin. No `onClick`, no form submission — the CTA is purely decorative in edit mode (the user's interest is editing the text, not triggering checkout).

### Update OrderForm

In `app/_sections/OrderForm.tsx`, change the `<CTA>` call to forward `edit`:

```tsx
<CTA
  type={edit ? "button" : "submit"}
  edit={edit}
  tag={<Edit edit={edit} path="order.ctaTagline">{order.ctaTagline}</Edit>}
  label={status === "busy" ? "Sending…" : <Edit edit={edit} path="order.ctaLabel">{order.ctaLabel}</Edit>}
  ariaLabel={order.ctaLabel}
/>
```

The `type` prop is now redundant when `edit=true` (the div branch ignores it) but harmless to keep for the non-edit path.

### Other CTA callsites

`<CTA>` is also used in other sections (likely `OnlySystem`, `Demo`, `GuaranteeSection`, `Stack`, etc.). Each of these is currently rendered with the same gotcha. Within scope for this chantier: update **every** callsite of `<CTA>` that's inside an admin-editable section to pass `edit={edit}` (the parent already has `edit` as a prop).

A grep for `<CTA` in `app/_sections/` will list them. The fix is a one-line change per call: add `edit={edit}`.

### Acceptance

- In admin mode, click directly on "Buy now" / "Get Your eBook Now!" text → contentEditable activates, caret appears, text becomes editable.
- In public mode, nothing changes: button still renders as `<button type="submit">`, form submits, CTA aria-label works.
- No visual difference between admin-mode div and public-mode button (same CSS class).
- No regressions on hover/focus state of the CTA in admin (the div doesn't get the button's native hover ring; `.ac-cta:hover` rules apply equally).

---

## Feature C — `order.badge` editability verification

### Current state

`order.badge` was migrated to `<EditRich>` in commit `e2be8c1` (Chantier image-slot/rich-text Task 9). The JSX is:

```tsx
<div className="ac-order__strip">
  <EditRich edit={edit} path="order.badge">{order.badge}</EditRich>
</div>
```

This SHOULD make it editable. The user reports it isn't.

### Investigation (post-deploy)

Once Chantier I A and B are deployed and the user can re-test, validate the badge:

1. Open the landing in admin on a fresh browser session (no cache).
2. Click directly on "NOW AVAILABLE FOR INSTANT DIGITAL DOWNLOAD".
3. Expected: floating toolbar appears on selection (`EditRich`-managed), contentEditable activates, caret visible, text editable.

If NOT editable, the most likely cause is a CSS rule on `.ac-order__strip` that blocks pointer events or text selection. Inspect via DevTools:
- `pointer-events` on `.ac-order__strip` or any descendant
- `user-select: none` (would block contentEditable)
- A `::before` / `::after` pseudo-element that overlays the text
- Z-index ordering — anything covering the strip

### Fix (conditional)

If a CSS blocker is found, the fix is one or two lines in `styles/landing.css`. Examples:

```css
.ac-order__strip { user-select: text; }
.ac-order__strip::before { pointer-events: none; }
```

If no blocker is found and the bug still reproduces, escalate — possibly a stale Service Worker, a Vercel cache layer, or a deploy that didn't include the commit. The Chantier I push will redeploy and likely fix it as a side-effect.

### Acceptance

- Click on the badge text → contentEditable activates and text is editable.
- The change persists on blur (autosave) and survives publish + page reload.

---

## Error handling

| Surface | Bad input | Behaviour |
|---|---|---|
| MediaSlot dropzone | User drops a non-image file in an image slot | Existing `useMediaUpload` validates and rejects with the existing error display |
| MediaSlot overlay | User clicks the overlay area outside the centered button | Click reaches the corner pill via z-index ordering; popover opens (same outcome) |
| CTA in admin | User accidentally clicks the CTA's `ac-cta__arrow` icon | The arrow is inside the `ac-cta__label` span; click bubbles to `<Edit>` parent → contentEditable activates |
| Badge | CSS fix doesn't actually unblock | Document the failure in the Chantier I retro; investigate in a separate small follow-up |

---

## Testing

- **No unit tests.** All three features are UI-visual changes that depend on real browser behavior (hover, contentEditable, drag-and-drop). Existing 149 vitest suite must remain green.
- **Manual smoke test** (in the implementation plan's final task):
  - MediaSlot: empty state shows dropzone, click and drop both upload, filled state shows pill + hover-overlay.
  - CTA: in admin, click the two CTA texts and confirm editability + autosave.
  - Badge: click "NOW AVAILABLE…" and confirm editability.

---

## Files touched

**Modified:**
- `app/_editor/MediaSlot.tsx` — empty/filled branches, overlay JSX
- `app/_sections/_shared/CTA.tsx` — new `edit` prop, conditional div vs button
- `app/_sections/OrderForm.tsx` — pass `edit` to `<CTA>`
- Other section files that use `<CTA>` (to be enumerated when planning) — pass `edit` to `<CTA>` calls
- `styles/landing.css` — new rules for dropzone, hover-overlay, (conditionally) `.ac-order__strip` fix

**No new files.**

## Build order

1. **A.1** MediaSlot empty-state dropzone branch + CSS
2. **A.2** MediaSlot filled-state hover-overlay + CSS
3. **B.1** Add `edit` prop to `<CTA>`; div-vs-button branch
4. **B.2** Update every `<CTA>` callsite to pass `edit={edit}`
5. **C.1** Manual verification of badge (post-deploy of A+B); fix CSS only if confirmed broken
6. **Final** Manual full smoke test + commit cleanup

Each task is its own commit.

## Backlog (out of scope, future work)

- **Chantier II — Editable decorative graphics:** GuaranteeBadge (3 places) and the 5 review stars become MediaSlots with fallback to the original SVG/CSS rendering.
- **Chantier III — Section background colors:** new `section.style.backgroundColor` property, palette + admin UI, render-time CSS injection.
