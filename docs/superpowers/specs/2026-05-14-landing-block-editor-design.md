# Landing Page Block Editor — Design

**Date:** 2026-05-14
**Status:** Approved (design), pending implementation plan

## Goal

Make the landing page editor let a non-technical user **edit blocks**, not just text:
reorder sections, hide/add/duplicate sections, change media in place (drag-and-drop),
and vary the number of photos/videos in a block — all WYSIWYG, "ultra intuitive".

## Decisions (from brainstorming)

| Question | Decision |
|----------|----------|
| Scope of "blocks" | **B** — reorder the body sections, manage internal items, hide sections, add a 2nd section of an existing type |
| Where editing happens | **C (hybrid)** — in-place WYSIWYG for text/media + a deliberately minimal collapsible "Structure" sidebar for order/hide/add. Sidebar must stay ultra-simple. |
| Replace a media | **B** — drag-and-drop a file onto the media replaces it; a `⋯` menu covers Library / URL / alt text |
| Number of media | **A** — any media block (`hero`, `demo`, `stack`) accepts multiple media → automatic responsive grid; lists gain drag-to-reorder |
| Video | Upload a video file (Vercel Blob) **and** paste a URL — both supported |
| Multi-media render | **Grid auto**, no carousel (keep it simple) |

## Current state (constraints)

- Content lives in `content/content.json` (Git), validated by `ContentSchema` (Zod) in `types/content.ts` — **12 fixed named keys**.
- Sections are hard-coded in render order in `app/_editor/LandingTree.tsx` and `app/page.tsx`.
- `EditorProvider` (`app/_editor/EditorProvider.tsx`): debounced save to Vercel Blob draft (`drafts/nik.json`), localStorage fallback, path-based `setField(path, value)` via `setByPath`.
- Edit affordances: `EditableText` (contentEditable), `MediaSwapButton` + `UploadModal` (Vercel Blob upload).
- `RepeatableList` does add/remove only — no reorder.
- Media files in Vercel Blob under `media/`; `/api/media` lists & deletes; `/admin/media` is a read-only grid.
- No drag-and-drop library.
- Note: the rendered `Hero` component consumes **two** schema keys (`hero` + `order`).

## Data model (v2)

New `content.json` shape:

```
{
  version: 2,
  meta:   { ... },        // unchanged, non-visual
  header: { ... },        // fixed chrome, NOT reorderable
  footer: { ... },        // fixed chrome, NOT reorderable
  sections: Section[]     // the reorderable page body
}

Section = {
  id: string              // stable, nanoid-generated
  type: SectionType
  hidden?: boolean        // hide without deleting
  data: <per-type schema>
}

SectionType =
  "headline" | "hero" | "logoStrip" | "onlySystem" | "demo"
  | "testimonials" | "stack" | "guarantee" | "faq"
```

- **9 body section types** = the current rendered body components. `header`/`footer`/`meta` stay out of `sections`.
- Multiple sections of the same `type` are allowed (e.g. two `testimonials` blocks).
- The `hero` section's `data` bundles the old `hero` + `order` objects.
- **Multi-media**: media-bearing fields in `hero`, `demo`, `stack` change from `MediaRef` to `MediaRef[]` (`MediaListSchema`). 1 element → simple render; >1 → grid.
- Each section type keeps its own Zod schema for `data` (largely the existing object schemas, refactored into a discriminated union on `type`).

### Migration

`migrateContent(raw): Content` in `types/content.ts`:
- Detects v1 (no `version`, fixed keys) and converts to v2: builds `sections` in the current render order, generates `id`s, merges `hero`+`order` into the `hero` section, wraps single `MediaRef` media fields into `[MediaRef]`.
- Idempotent: passing a v2 document returns it unchanged.
- Called on every read path: `app/page.tsx` (public), `LandingTree` initial, `/api/draft` GET, `/api/publish` validation.
- `content/content.json` is migrated once and committed as part of implementation.

## Editor UX (hybrid)

### Structure sidebar (new, minimal)
- Collapsible panel, left side. Collapsed to a thin handle by default so WYSIWYG stays full-width.
- One row per section: `⠿ handle` · name · `👁 eye` (hide toggle) · `⋯` (Duplicate / Delete).
- Drag the handle to reorder — preview updates live.
- Hidden sections appear greyed in the list and are removed from render.
- `+ Add a section` button → list of the 9 types; clicking inserts at the bottom, user drags it into place.
- New components: `StructurePanel`, `SectionRow`, `AddSectionMenu`.

### In-place affordances
- Hover on a section → outline + small name label (`SectionHoverFrame`) so the user knows which block they're in. No heavy toolbar.
- Text editing: `EditableText` unchanged.
- Media & lists: see below.

### Library / DnD
- Add `@dnd-kit/core` + `@dnd-kit/sortable`.
- Shared `SortableList` wrapper used by `StructurePanel`, `RepeatableList`, and `MediaGallery`.

## Media handling

`MediaSwapButton` + `UploadModal` are replaced by:

- **`MediaSlot`** — represents one media. Supports:
  - Drag-and-drop a file onto it → upload to Vercel Blob (reuses existing signed-upload flow) → replace. Works for images **and video files**.
  - `⋯` menu: **Library** (opens `MediaLibraryPopover`), **URL** (paste a link), **Alt text** (accessibility field).
- **`MediaLibraryPopover`** — inline popover listing all uploaded media from `/api/media`; click to select. This is the "without going through the gallery" requirement — the gallery becomes reachable in place.
- **`MediaGallery`** — replaces single-media rendering in `hero`/`demo`/`stack`:
  - 1 media → simple render, visually identical to today (no regression).
  - >1 media → automatic responsive grid (public render).
  - Edit mode: each media has `⠿` (reorder) + `🗑` (remove); a `+` slot adds one (file drop / Library / URL).
- Videos: `videoUrl` may point to an uploaded Blob asset or a pasted external URL. `videoPoster` becomes a full `MediaSlot`.
- `/admin/media` stays, now only for housekeeping (view/delete).

## Lists

- `RepeatableList` extended with `@dnd-kit` drag handle → reorder. Add/remove kept.
- Applies to: testimonials items, FAQ items, onlySystem features, order mini-testimonials, stack items.
- Video testimonials use `MediaSlot` for their per-item media.

## Save / publish

- `EditorProvider` save/draft/publish flow unchanged (debounce, Blob draft, GitHub publish).
- `migrateContent()` applied on read.
- Edit paths address sections by **`id`**, not array index, so they survive reordering: add `updateSection(id, updater)` alongside `setField`. `setByPath` still used for within-section field edits, rooted at the section's `data`.

## Rendering

- A `SECTION_REGISTRY` maps `SectionType → component`.
- `app/page.tsx` (public) and `LandingTree` (editor) both `.map()` over `content.sections`, skipping `hidden` ones (public) / showing them greyed (editor). `header`/`footer` rendered fixed around the mapped body.

## Testing

- Unit tests: `migrateContent` (v1→v2 correctness, idempotence), each section Zod schema, `MediaListSchema`.
- Regression check: single-media render output identical to pre-change for `hero`/`demo`/`stack`.

## Out of scope

- Carousels (grid only).
- Free-form block editor (Webflow/Notion style — that was option C, rejected).
- New section types beyond the existing 9.
- Reordering `header`/`footer`.

## New / changed files (indicative)

- `types/content.ts` — v2 schema, `Section` union, `MediaListSchema`, `migrateContent`.
- `content/content.json` — migrated to v2.
- `app/_editor/EditorProvider.tsx` — `updateSection`, migrate on load.
- `app/_editor/LandingTree.tsx` + `app/page.tsx` — map over `sections`, `SECTION_REGISTRY`.
- `app/_editor/StructurePanel.tsx`, `SectionRow.tsx`, `AddSectionMenu.tsx`, `SectionHoverFrame.tsx` — new.
- `app/_editor/MediaSlot.tsx`, `MediaLibraryPopover.tsx`, `MediaGallery.tsx` — new (replace `MediaSwapButton`/`UploadModal`).
- `app/_editor/RepeatableList.tsx` — add DnD reorder; `SortableList.tsx` — new shared wrapper.
- `app/_sections/*` — accept array media, render via `MediaGallery`; `Hero` reads bundled `hero`+`order` data.
- `package.json` — `@dnd-kit/core`, `@dnd-kit/sortable`, `nanoid`.
