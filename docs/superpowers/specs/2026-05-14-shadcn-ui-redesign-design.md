# Advanguard UI Redesign — shadcn/ui, monochrome, light+dark

**Date:** 2026-05-14
**Status:** Approved design — ready for implementation planning

## Goal

Replace the app's ad-hoc UI (CSS modules + heavy inline `style={{}}`) with a single,
clean design system: **Tailwind CSS v4 + shadcn/ui**, a **monochrome** visual language,
a **light/dark toggle** (default dark), and **native CSS/Radix animations**. Applies to
**every surface**: the admin area, the editor chrome, and the landing page.

## Decisions (locked during brainstorming)

| Topic | Decision |
|---|---|
| Scope | Admin pages + editor chrome + landing page sections — the whole app |
| Library | Tailwind v4 + shadcn/ui, installed **globally** (no scoping — landing is in scope) |
| Visual direction | **Monochrome** (option C): near-black/true-black surfaces, white/grey text, white inverted buttons in dark mode; mirrored for light mode. Accent colour used almost never. |
| Theme modes | Light **and** dark, switchable via `next-themes`. Default **dark**. Persisted to `localStorage`. |
| Animations | Native — CSS transitions + Radix/shadcn built-in animations (`tw-animate-css`). No `framer-motion`. |
| Admin layout | Top-bar + hub (current structure), restyled. Theme toggle lives in the top bar. |
| Icons | Adopt `lucide-react` for app/admin/editor UI. The landing keeps its bespoke `Icons` set where those icons are part of the marketing design. |

## Tech context

- Next.js 16.2.6 (App Router, Turbopack), React 19.2.4, TypeScript 5.
- Currently **no** Tailwind, PostCSS config, or `components.json`.
- Styling today: `app/globals.css` (`@import`s `tokens.css`, `colors_and_type.css`, `landing.css`),
  `app/admin/_components/{layout,ui}.module.css`, and inline `style={{}}` across ~23 files.
- shadcn/ui supports Tailwind v4 + React 19.

---

## Architecture

### 1. Foundation

**Install & init**
- Add Tailwind v4 (`tailwindcss`, `@tailwindcss/postcss`, `postcss`) and create `postcss.config.mjs`.
- `npx shadcn@latest init` → generates `components.json` (style: default, base color: neutral,
  CSS variables: yes), aliases `@/components/ui`, `@/lib/utils` (the `cn()` helper).
- Add `tw-animate-css` (shadcn's Tailwind v4 animation utilities) and `next-themes`.

**Theme tokens** — `app/globals.css` becomes the single source of truth:
- `@import "tailwindcss"` + `@import "tw-animate-css"`.
- `@theme` block maps the design tokens (radius, fonts).
- `:root` = light mode CSS variables; `.dark` = dark mode CSS variables. Monochrome palette:
  - **Dark:** `--background` near/true black, `--card` slightly lifted (`#0d0d0d`), `--border` `#1f1f1f`,
    `--foreground` white, `--muted-foreground` grey, `--primary` white / `--primary-foreground` black.
  - **Light:** mirrored — white background, near-white cards, light-grey borders, near-black text,
    black `--primary` / white `--primary-foreground`.
- Existing typographic values from `tokens.css` / `colors_and_type.css` are folded into the
  `@theme` block and the variable set. `tokens.css` and `colors_and_type.css` are deleted once
  every consumer is migrated; `landing.css` is deleted at the end of the landing phase.

**Theme switching**
- `next-themes` `ThemeProvider` wraps the app in `app/layout.tsx` (`attribute="class"`,
  `defaultTheme="dark"`, `enableSystem={false}`).
- A `ThemeToggle` client component (`app/_components/ThemeToggle.tsx`) — a shadcn `Button`
  (icon variant) toggling `light`/`dark`. Rendered in the admin top bar and in the editor `PublishBar`.

**`<html>`** gets `suppressHydrationWarning` (next-themes requirement).

### 2. Shared primitives

shadcn components added under `components/ui/`:
`button, input, textarea, label, card, dialog, alert-dialog, dropdown-menu, popover,
tooltip, badge, switch, tabs, separator, scroll-area, skeleton, sonner`.

Existing custom components map onto these:
- `app/_components/ConfirmDialog.tsx` → rebuilt on shadcn **AlertDialog** (keeps the same props
  surface: `open, title, description, confirmLabel, cancelLabel, destructive, onConfirm, onCancel`
  so callers don't change).
- `app/_components/Toast.tsx` (`ToastProvider` + `useToast`) → replaced by **Sonner**.
  `useToast` callers switch to `toast()` from `sonner`; `<Toaster />` mounts in the root layout
  and the editor tree. `ToastProvider` is removed.
- `lib/utils.ts` added with `cn()` (clsx + tailwind-merge).

### 3. Admin (`app/admin/*`)

Top-bar + hub structure kept. Every file loses its inline styles / CSS module in favour of
shadcn components + Tailwind classes:
- `app/admin/_components/AdminChrome.tsx`, `TopBar.tsx`, `BackLink.tsx`, `LogoutButton.tsx` —
  restyled; `TopBar` gains the `ThemeToggle`. `layout.module.css` + `ui.module.css` deleted.
- `app/admin/page.tsx` (dashboard) — hub of shadcn `Card`s; primary "Edit the landing page"
  action as a prominent card.
- `app/admin/login/page.tsx` — centered `Card` with `Input` + `Button`.
- `app/admin/media/page.tsx` + `MediaGrid.tsx` — responsive grid of `Card`s; delete via
  `AlertDialog`; copy/delete as `Button`s with `lucide-react` icons.
- `app/admin/settings/page.tsx` — `Card` with status rows; status as `Badge`.
- `app/admin/funnel/page.tsx` + `PromptEditor.tsx` — form rebuilt with `Label` + `Textarea` +
  `Tabs` + `Button`; the audit-preview panel uses `Card` / `Skeleton` for loading.

### 4. Editor chrome (`app/_editor/*`)

The chrome that overlays the landing in edit mode, rebuilt on shadcn primitives + theme tokens
so it follows the light/dark toggle. Per file:
- `PublishBar.tsx` — `Button`s, `Badge` (diff chip), status pill; hosts a `ThemeToggle`. Preview
  mode still collapses to the single floating button.
- `StructurePanel.tsx` — `ScrollArea` panel; rows use shadcn primitives.
- `SectionRow.tsx` — `DropdownMenu` for the ⋯ actions, `AlertDialog` for delete.
- `AddSectionMenu.tsx` — `DropdownMenu`.
- `MediaSlot.tsx` + `MediaLibraryPopover.tsx` — `Popover` + `Button` + `Input`; the menu/library/
  url/alt views become clean popover content.
- `TestimonialTypeToggle.tsx` — shadcn `Tabs` or a segmented `Button` group.
- `EditableText.tsx`, `SectionHoverFrame.tsx`, `RepeatableList.tsx` — keep their behaviour;
  inline styles replaced with Tailwind classes / tokens. `RepeatableList`'s `+ Add` and drag
  handles use shadcn `Button` styling. `app/_editor/styles.module.css` is folded into Tailwind.

### 5. Landing page (`app/_sections/*`)

The ~11 sections (`Header, Headline, Hero, OrderForm, LogoStrip, OnlySystem, Demo, Testimonials,
Stack, GuaranteeSection, FAQ, Footer`) and shared pieces (`Book, CTA, GuaranteeBadge, Reveal,
Stars, VideoPlayer, Icons`) rebuilt with Tailwind + the monochrome tokens. `styles/landing.css`
is removed at the end of this phase. The page keeps its current structure, copy, content schema
(`types/content.ts`), and editing hooks (`Edit`, `MediaSlot`, `RepeatableList`) — only the
styling layer changes. This is the largest and most sensitive phase: it is done last, section by
section, each verified visually in the browser before moving on.

---

## File-structure impact

**Created:** `components.json`, `postcss.config.mjs`, `lib/utils.ts`, `components/ui/*` (shadcn),
`app/_components/ThemeToggle.tsx`.
**Heavily modified:** `app/globals.css`, `app/layout.tsx`, every file under `app/admin/`,
`app/_editor/`, `app/_sections/`, and `app/_components/`.
**Deleted (progressively):** `app/_styles/tokens.css`, `styles/colors_and_type.css`,
`styles/landing.css`, `app/admin/_components/layout.module.css`,
`app/admin/_components/ui.module.css`, `app/_editor/styles.module.css`,
`app/_components/Toast.tsx`.
**Unchanged:** all of `lib/`, `types/`, `content/`, `app/api/`, `middleware.ts`, the audit
pipeline, and all tests' subjects (tests target logic, not styling).

## Phasing

Each phase is independently shippable and leaves the app working.

1. **Foundation** — Tailwind + shadcn init, theme tokens, `next-themes`, `ThemeToggle`,
   `lib/utils.ts`. App still renders with old styles where not yet migrated.
2. **Shared primitives** — install shadcn components; rebuild `ConfirmDialog` on `AlertDialog`,
   swap `Toast` → Sonner across callers.
3. **Admin** — migrate all `app/admin/*` surfaces; delete the admin CSS modules.
4. **Editor chrome** — migrate all `app/_editor/*`; delete `styles.module.css`.
5. **Landing** — migrate `app/_sections/*` section by section; delete `landing.css`,
   `colors_and_type.css`, `tokens.css`.

## Risks & mitigations

- **Landing regression** — the landing converts; restyling it can shift layout/spacing.
  Mitigation: it is the last phase, migrated one section at a time with visual verification,
  and the content schema/editing hooks are untouched so the editor keeps working.
- **Global Tailwind preflight** — applied globally (intended, since the landing is in scope).
  Because the landing is migrated to Tailwind anyway, there is no lingering "old CSS vs preflight"
  conflict by the end; during phases 1-4 the landing temporarily coexists with preflight and is
  spot-checked.
- **Theme flash on load** — handled by `next-themes` + `suppressHydrationWarning`.
- **Hydration with `next-themes`** — `ThemeToggle` is a client component; the provider is set up
  per next-themes docs.

## Testing & verification

- The 83 existing tests target logic (audit pipeline, content migration, GHL) — not styling — so
  they must stay green after every phase (`npm test`).
- `npx tsc --noEmit` and `npm run build` green after every phase.
- Each phase verified in the browser via the dev server: admin surfaces logged in, editor chrome
  in edit mode, landing as a visitor — in **both** light and dark modes.

## Out of scope

- No change to app behaviour, routes, the content schema, the audit pipeline, or auth.
- No new features — this is a styling/design-system migration only.
- No `framer-motion` / JS animation library.
