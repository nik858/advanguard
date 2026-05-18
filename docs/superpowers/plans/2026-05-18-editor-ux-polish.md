# Editor UX polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every editable target on the landing reliably discoverable and reachable in admin mode — visible dropzone when an image slot is empty, hover-overlay when filled, and clickable contentEditable text inside the order-form CTA button.

**Architecture:** Three independent UI fixes. MediaSlot becomes self-aware of empty vs filled state and renders accordingly. CTA component branches to a `<div role="button">` in edit mode (avoids contentEditable-inside-button browser quirks). Badge bug verified post-deploy and fixed only if confirmed broken.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, no new dependencies.

**Spec:** [docs/superpowers/specs/2026-05-18-editor-ux-polish-design.md](../specs/2026-05-18-editor-ux-polish-design.md)

---

## Task 1 — MediaSlot empty-state dropzone

**Files:**
- Modify: `app/_editor/MediaSlot.tsx`

This task introduces the empty-state branch: when there's no media in the slot AND `compact` is false, render a centered dashed dropzone instead of the corner pill + transparent drop overlay. The popover positioning stays the same (corner of the parent), so it works for both branches without further changes.

- [ ] **Step 1: Open `app/_editor/MediaSlot.tsx` and add an `isEmpty` flag derived from `current`**

Locate this existing block (around line 120-123, right after the popover/keydown effects, just before `if (state.previewMode) return null;`):

```tsx
if (state.previewMode) return null;

const current = fullPath.split(".").reduce<unknown>(
  (acc, k) => (acc as Record<string, unknown> | undefined)?.[k.match(/^\d+$/) ? Number(k) : (k as string)],
  state.draft as unknown,
);
```

Immediately AFTER the `current` declaration, add:

```tsx
const currentUrl = typeof current === "string"
  ? current
  : (current as { url?: string } | undefined)?.url ?? "";
const isEmpty = !currentUrl;
```

- [ ] **Step 2: Add an early-return branch for the empty + non-compact case**

The current return statement begins around line 193 (`return (`). Insert this BEFORE the existing `return`:

```tsx
if (isEmpty && !compact) {
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); setView("menu"); }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        aria-label={`Upload ${accept}`}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          minHeight: 120,
          width: "100%",
          background: dragActive ? "rgba(28,123,253,0.12)" : "rgba(28,127,255,0.04)",
          border: `2px dashed ${dragActive ? "#1c7bfd" : "rgba(28,127,255,0.5)"}`,
          borderRadius: 8,
          cursor: "pointer",
          color: "#1c7bfd",
          fontFamily: "var(--adv-font, system-ui, sans-serif)",
          fontSize: 13,
          fontWeight: 500,
          padding: 12,
          transition: "background 150ms ease-in-out, border-color 150ms ease-in-out",
        }}
      >
        <Icons.Pencil />
        <span>{dragActive ? `Drop to upload this ${accept}` : `Click or drop a${accept === "image" ? "n image" : " video"}`}</span>
      </button>

      {/* Popover */}
      {open && (
        <div
          ref={popoverRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: popoverTop,
            right: compact ? 4 : 10,
            zIndex: 11,
            width: 280,
            background: "#fff",
            border: "1px solid var(--adv-border, #e7e7ea)",
            borderRadius: 10,
            boxShadow: "0 12px 32px rgba(0,0,0,0.16)",
            padding: 10,
            fontFamily: "var(--adv-font, system-ui, sans-serif)",
            fontSize: 13,
            color: "#18181b",
          }}
        >
          {view === "menu" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <button type="button" style={popItem} onClick={() => fileRef.current?.click()}>
                Upload a file
              </button>
              <button type="button" style={popItem} onClick={() => setView("library")}>
                Choose from library
              </button>
              <button type="button" style={popItem} onClick={() => setView("url")}>
                Paste a URL
              </button>
              {accept === "image" && (
                <button type="button" style={popItem} onClick={() => {
                  setAltInput(typeof current === "object" && current !== null ? String((current as { alt?: string }).alt ?? "") : "");
                  setView("alt");
                }}>
                  Alt text
                </button>
              )}
              <p style={{ fontSize: 11, color: "#a1a1aa", margin: "6px 2px 0" }}>
                …or drag a {accept} file straight onto it.
              </p>
            </div>
          )}

          {view === "library" && (
            <div>
              <button type="button" style={popBack} onClick={() => setView("menu")}>‹ Back</button>
              <MediaLibraryPopover accept={accept} onSelect={applyUrl} />
            </div>
          )}

          {view === "url" && (
            <div>
              <button type="button" style={popBack} onClick={() => setView("menu")}>‹ Back</button>
              <input
                type="url"
                placeholder={accept === "video" ? "https://… (YouTube, Vimeo, .mp4)" : "https://…/image.jpg"}
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                style={popInput}
              />
              <button
                type="button"
                onClick={() => { if (urlInput.trim()) applyUrl(urlInput.trim()); }}
                style={popPrimary}
              >
                Use this URL
              </button>
            </div>
          )}

          {view === "alt" && (
            <div>
              <button type="button" style={popBack} onClick={() => setView("menu")}>‹ Back</button>
              <input
                type="text"
                placeholder="Describe the image (accessibility)"
                value={altInput}
                onChange={(e) => setAltInput(e.target.value)}
                style={popInput}
              />
              <button type="button" onClick={() => applyAlt(altInput.trim())} style={popPrimary}>
                Save alt text
              </button>
            </div>
          )}

          {busy && <p style={{ fontSize: 12, color: "#71717a", marginTop: 8 }}>Uploading…</p>}
          {error && <p style={{ fontSize: 12, color: "#c62828", marginTop: 8 }}>{error}</p>}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept={accept === "image" ? "image/*" : "video/mp4,video/webm,video/quicktime"}
        style={{ display: "none" }}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </>
  );
}
```

The popover, file input, and view logic are duplicated from the existing branch for now — the next task (hover-overlay) keeps the same popover structure for the filled branch, so we end up with one shared popover after a small refactor at the end. Don't pre-emptively factor; the plan adds a refactor commit later if needed.

NOTE: this branch deliberately omits the transparent drop-overlay div from the existing branch (the dropzone IS the drop target). The window-level drag detection in `useEffect` stays as-is — it only toggles `dragActive` state to highlight the dropzone.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add app/_editor/MediaSlot.tsx
git commit -m "feat(editor): MediaSlot shows dashed dropzone when empty"
```

---

## Task 2 — MediaSlot filled-state hover overlay

**Files:**
- Modify: `app/_editor/MediaSlot.tsx`

This task improves the filled state (image already set). The existing transparent drop overlay div becomes a hover-aware overlay: by default invisible, on hover it dims the image and shows a large centered "Change" button. The corner pill stays for backup.

- [ ] **Step 1: Add a `hovered` state hook near the other `useState` hooks**

In `app/_editor/MediaSlot.tsx`, find the existing state hooks (around lines 67-72):

```tsx
const [open, setOpen] = useState(false);
const [view, setView] = useState<View>("menu");
const [dragActive, setDragActive] = useState(false);
const [urlInput, setUrlInput] = useState("");
const [altInput, setAltInput] = useState("");
```

Add right after them:

```tsx
const [hovered, setHovered] = useState(false);
```

- [ ] **Step 2: Update the drop overlay div in the existing (filled) branch to also track hover and render a centered Change button on hover**

Find the existing drop-overlay block (around lines 196-220 of the original file, now lower because of Task 1's additions). It currently looks like:

```tsx
<div
  onDragOver={(e) => { e.preventDefault(); }}
  onDrop={(e) => {
    e.preventDefault();
    setDragActive(false);
    handleFile(e.dataTransfer.files?.[0]);
  }}
  style={{
    position: "absolute",
    inset: 0,
    zIndex: 9,
    pointerEvents: dragActive ? "auto" : "none",
    border: dragActive ? "2px dashed #1c7bfd" : "2px dashed transparent",
    background: dragActive ? "rgba(28,123,253,0.12)" : "transparent",
    display: "grid",
    placeItems: "center",
    fontFamily: "var(--adv-font, system-ui, sans-serif)",
    fontSize: 13,
    fontWeight: 600,
    color: "#1c7bfd",
    borderRadius: 8,
  }}
>
  {dragActive ? `Drop to replace this ${accept}` : null}
</div>
```

Replace it with:

```tsx
<div
  onMouseEnter={() => setHovered(true)}
  onMouseLeave={() => setHovered(false)}
  onClick={(e) => { e.stopPropagation(); setOpen(true); setView("menu"); }}
  onDragOver={(e) => { e.preventDefault(); }}
  onDrop={(e) => {
    e.preventDefault();
    setDragActive(false);
    handleFile(e.dataTransfer.files?.[0]);
  }}
  style={{
    position: "absolute",
    inset: 0,
    zIndex: 9,
    pointerEvents: "auto",
    cursor: "pointer",
    border: dragActive ? "2px dashed #1c7bfd" : "2px dashed transparent",
    background: dragActive
      ? "rgba(28,123,253,0.12)"
      : hovered
        ? "rgba(0,0,0,0.4)"
        : "transparent",
    display: "grid",
    placeItems: "center",
    fontFamily: "var(--adv-font, system-ui, sans-serif)",
    fontSize: 13,
    fontWeight: 600,
    color: dragActive ? "#1c7bfd" : "#fff",
    borderRadius: 8,
    transition: "background 150ms ease-in-out",
  }}
>
  {dragActive
    ? `Drop to replace this ${accept}`
    : hovered && !compact
      ? (
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "#fff",
          color: "#18181b",
          padding: "8px 16px",
          borderRadius: 999,
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          fontSize: 14,
          fontWeight: 600,
        }}>
          <Icons.Pencil /> Change
        </span>
      )
      : null}
</div>
```

Key changes vs the old version:
- `pointerEvents: "auto"` always (was `dragActive ? "auto" : "none"`) — required so onMouseEnter/Leave fire.
- `onMouseEnter`/`onMouseLeave` toggle the `hovered` state.
- `onClick` opens the popover (acts as a backup trigger to the corner pill).
- Background paints `rgba(0,0,0,0.4)` semi-dark on hover, with smooth transition.
- On hover (and not in compact mode), a centered white pill button with pencil icon + "Change" label appears.
- `dragActive` precedence stays — when actively dragging a file, the dashed-blue treatment overrides the hover treatment.

The corner pill button (lines 222-232 of the original) is unchanged — it remains a redundant always-visible trigger and the position anchor for the popover.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add app/_editor/MediaSlot.tsx
git commit -m "feat(editor): MediaSlot shows hover-overlay with centered Change button when filled"
```

---

## Task 3 — CTA edit prop (branch div vs button)

**Files:**
- Modify: `app/_sections/_shared/CTA.tsx`

This task gives `<CTA>` an `edit` prop. When `edit === true`, render a `<div role="button">` instead of a `<button>` so contentEditable text inside is reachable. Visual appearance is identical (same CSS class).

- [ ] **Step 1: Replace the contents of `app/_sections/_shared/CTA.tsx`**

```tsx
"use client";
import type { ReactNode } from "react";
import { Icons } from "./Icons";

export function CTA({
  tag,
  label,
  compact = false,
  ariaLabel,
  onClick,
  type = "button",
  edit = false,
}: {
  tag?: ReactNode;
  label: ReactNode;
  compact?: boolean;
  ariaLabel?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  edit?: boolean;
}) {
  const ariaFallback = typeof label === "string" ? label : undefined;

  if (edit) {
    return (
      <div
        className={`ac-cta ${compact ? "ac-cta--compact" : ""}`}
        role="button"
        aria-label={ariaLabel || ariaFallback}
      >
        {tag && <span className="ac-cta__tag">{tag}</span>}
        <span className="ac-cta__label">{label}<span className="ac-cta__arrow"><Icons.ArrowRight/></span></span>
      </div>
    );
  }

  return (
    <button
      className={`ac-cta ${compact ? "ac-cta--compact" : ""}`}
      type={type}
      onClick={onClick}
      aria-label={ariaLabel || ariaFallback}
    >
      {tag && <span className="ac-cta__tag">{tag}</span>}
      <span className="ac-cta__label">{label}<span className="ac-cta__arrow"><Icons.ArrowRight/></span></span>
    </button>
  );
}
```

Changes:
- New `edit?: boolean` prop (default `false`).
- When `edit === true`, render `<div role="button">` with no `onClick` and no `type` attribute. The contentEditable text inside `tag` / `label` can receive clicks without the button swallowing them.
- Non-edit path is unchanged.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean. Other CTA callsites that don't pass `edit` continue to default to `false` and render as `<button>` (no regression).

- [ ] **Step 3: Commit**

```bash
git add app/_sections/_shared/CTA.tsx
git commit -m "feat(landing): CTA renders as div in edit mode so contentEditable inside is reachable"
```

---

## Task 4 — OrderForm passes edit to CTA

**Files:**
- Modify: `app/_sections/OrderForm.tsx`

Only OrderForm needs this. The other `<CTA>` callsites (Footer, Stack, OnlySystem) pass plain strings to `tag` / `label` — no contentEditable inside, so no benefit from the div swap.

- [ ] **Step 1: Add `edit={edit}` to the `<CTA>` call**

Open `app/_sections/OrderForm.tsx`. Find the existing CTA call (around line 124):

```tsx
<CTA
  type={edit ? "button" : "submit"}
  tag={<Edit edit={edit} path="order.ctaTagline">{order.ctaTagline}</Edit>}
  label={status === "busy"
    ? "Sending…"
    : <Edit edit={edit} path="order.ctaLabel">{order.ctaLabel}</Edit>}
  ariaLabel={order.ctaLabel}
/>
```

Add `edit={edit}` as a new prop (placement: between `type` and `tag` for readability):

```tsx
<CTA
  type={edit ? "button" : "submit"}
  edit={edit}
  tag={<Edit edit={edit} path="order.ctaTagline">{order.ctaTagline}</Edit>}
  label={status === "busy"
    ? "Sending…"
    : <Edit edit={edit} path="order.ctaLabel">{order.ctaLabel}</Edit>}
  ariaLabel={order.ctaLabel}
/>
```

- [ ] **Step 2: Typecheck + tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean + all 149 tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/_sections/OrderForm.tsx
git commit -m "feat(landing): OrderForm passes edit prop to its CTA"
```

---

## Task 5 — Final verification + badge bug check

This wraps up the chantier. Steps 1-2 are automated. Step 3 is a manual smoke test (handed off to the human). Step 4 is the conditional badge fix (only if the manual smoke confirms the bug).

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: 149 / 149 pass. Anything else = regression; stop and fix.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: clean build. Pre-existing warnings about middleware convention and missing `metadataBase` are OK; any NEW warning or error is a regression.

- [ ] **Step 3: Push and manual smoke test (handed off to the human)**

```bash
git push origin main
```

After Vercel redeploys, walk through these checks in the browser (admin mode):

**A — MediaSlot empty state:**
- Find an image slot without an image (e.g., the order box's `order.image` slot if no image is set, or any logo slot in `LogoStrip`).
- Confirm: dashed blue rectangle, centered with pencil icon + "Click or drop an image" text. Min-height ~120px.
- Click → upload popover opens.
- Drag a file from your desktop → border turns solid blue, text changes to "Drop to upload…", drop succeeds.

**B — MediaSlot filled state:**
- Find any slot with an image already set.
- Confirm: image visible normally, small "Change" pill in the corner.
- Hover over the image → semi-dark overlay fades in, large white "Change" pill appears centered. Click → popover opens.
- Move mouse away → overlay fades out.

**C — CTA editability:**
- Open the order box in admin.
- Click directly on the green "Get Your eBook Now!" subtitle text → contentEditable activates.
- Click directly on the white "Buy now" label → contentEditable activates.
- Edit either, blur → autosaves. Refresh page → change persists.

**D — Badge editability (the post-deploy verification):**
- Click directly on "NOW AVAILABLE FOR INSTANT DIGITAL DOWNLOAD" inside the blue strip at the top of the order box.
- Confirm: contentEditable activates, caret appears, text becomes editable, change persists on blur/refresh.

- [ ] **Step 4: Conditional badge fix (run ONLY if Step 3-D failed)**

If clicking on "NOW AVAILABLE…" in Step 3-D does NOT activate contentEditable, the cause is a CSS rule blocking interaction. Inspect via DevTools:

- `.ac-order__strip` and its inner `<span>` for `pointer-events`, `user-select`, or `cursor` rules that would block clicks.
- Any `::before` / `::after` pseudo-element covering the text.
- Any z-index sibling overlapping the strip.

Apply the minimal fix in `styles/landing.css`. Typical patterns (pick the one matching the actual blocker):

```css
.ac-order__strip { user-select: text; }
/* or */
.ac-order__strip::before { pointer-events: none; }
```

Then verify the fix works in the browser and commit:

```bash
git add styles/landing.css
git commit -m "fix(landing): unblock click target on order.badge in admin mode"
git push origin main
```

If Step 3-D passed without needing a fix, commit a no-op confirmation:

```bash
git commit --allow-empty -m "chore(landing): confirm order.badge is editable post-deploy (no bug)"
git push origin main
```

---

## Out of scope (tracked in spec backlog)

- **Chantier III — Section background colors:** new per-section `style.backgroundColor` property, palette + admin UI, render-time CSS injection.
- **Chantier II — Editable decorative graphics:** GuaranteeBadge (3 places) and the 5 review stars become MediaSlots with fallback to the original SVG/CSS rendering.
- **Footer / Stack / OnlySystem CTA texts editable:** those CTAs currently pass plain strings (not `<Edit>`); making them rich-text-editable is a separate feature for whoever decides those texts should be admin-editable.
