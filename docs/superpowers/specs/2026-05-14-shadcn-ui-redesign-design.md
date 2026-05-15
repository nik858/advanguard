# Advanguard UI Redesign — shadcn/ui, monochrome, light+dark

**Date:** 2026-05-14
**Status:** Approved design — ready for implementation planning

## Goal

Replace the **admin and editor-chrome** UI (CSS modules + heavy inline `style={{}}`) with a
single, clean design system: **Tailwind CSS v4 + shadcn/ui**, a **monochrome** visual language,
a **light/dark toggle** (default dark), and **native CSS/Radix animations**. The **landing page
is explicitly out of scope and must not change visually** — its existing CSS is preserved and
Tailwind's base reset is scoped so it cannot leak onto it.

## Decisions (locked during brainstorming)

| Topic | Decision |
|---|---|
| Scope | Admin pages + editor chrome. **Landing page (`app/_sections/*`, `styles/landing.css`) is NOT touched.** |
| Library | Tailwind v4 + shadcn/ui. Theme + utilities are global; **the base reset (preflight) is scoped to a `[data-adv-ui]` wrapper** so the landing is byte-for-byte unchanged. |
| Visual direction | **Monochrome** (option C): near-black/true-black surfaces, white/grey text, white inverted buttons in dark mode; mirrored for light mode. Accent colour used almost never. |
| Theme modes | Light **and** dark, switchable via `next-themes`. Default **dark**. Persisted to `localStorage`. |
| Animations | Native — CSS transitions + Radix/shadcn built-in animations (`tw-animate-css`). No `framer-motion`. |
| Admin layout | Top-bar + hub (current structure), restyled. Theme toggle lives in the top bar. |
| Icons | Adopt `lucide-react` for admin + editor UI. The landing keeps its bespoke `Icons` set untouched. |

## Tech context

- Next.js 16.2.6 (App Router, Turbopack), React 19.2.4, TypeScript 5.
- Currently **no** Tailwind, PostCSS config, or `components.json`.
- Styling today: `app/globals.css` (`@import`s `tokens.css`, `colors_and_type.css`, `landing.css`),
  `app/admin/_components/{layout,ui}.module.css`, `app/_editor/styles.module.css`, and inline
  `style={{}}` across ~23 files.
- shadcn/ui supports Tailwind v4 + React 19.

---

## Architecture

### 1. Foundation

**Install & init**
- Add Tailwind v4 (`tailwindcss`, `@tailwindcss/postcss`, `postcss`) and create `postcss.config.mjs`.
- `npx shadcn@latest init` → generates `components.json` (style: default, base color: neutral,
  CSS variables: yes), aliases `@/components/ui`, `@/lib/utils` (the `cn()` helper).
- Add `tw-animate-css` (shadcn's Tailwind v4 animation utilities) and `next-themes`.

**Scoped preflight — the key constraint.** Tailwind v4's `@import "tailwindcss"` bundles theme +
preflight + utilities, and preflight is a global reset that would alter the landing
(`img`, `button`, `h1`, margins, border defaults). To guarantee zero landing impact:
- `app/globals.css` imports Tailwind's **theme** and **utilities** globally, but **not** the
  global preflight.
- A small reset equivalent (box-sizing, default border colour, button/input font inheritance,
  the handful of resets shadcn components rely on) is written **scoped under `[data-adv-ui]`**.
- The admin layout root and the editor-chrome root render with a `data-adv-ui` attribute.
  The landing page has no `data-adv-ui` anywhere → it is completely unaffected.

**Theme tokens** — defined in `app/globals.css`:
- `@theme` block maps the design tokens (radius, fonts) for the new UI.
- Light/dark monochrome palette as CSS variables, applied under `[data-adv-ui]` (and toggled by
  the `.dark` class on `<html>` via `next-themes`):
  - **Dark:** `--background` near/true black, `--card` slightly lifted (`#0d0d0d`), `--border`
    `#1f1f1f`, `--foreground` white, `--muted-foreground` grey, `--primary` white /
    `--primary-foreground` black.
  - **Light:** mirrored — white background, near-white cards, light-grey borders, near-black
    text, black `--primary` / white `--primary-foreground`.
- `tokens.css`, `colors_and_type.css`, and `landing.css` are **kept** — the landing still depends
  on them. Only the admin/editor styling files are deleted (see File-structure impact).

**Theme switching**
- `next-themes` `ThemeProvider` wraps the app in `app/layout.tsx` (`attribute="class"`,
  `defaultTheme="dark"`, `enableSystem={false}`). `.dark` on `<html>` is inert for the landing
  (the landing reads its own CSS variables, not the Tailwind theme vars).
- A `ThemeToggle` client component (`app/_components/ThemeToggle.tsx`) — a shadcn `Button`
  (icon variant) toggling `light`/`dark`. Rendered in the admin top bar and the editor `PublishBar`.
- `<html>` gets `suppressHydrationWarning` (next-themes requirement).

### 2. Shared primitives

shadcn components added under `components/ui/`:
`button, input, textarea, label, card, dialog, alert-dialog, dropdown-menu, popover,
tooltip, badge, switch, tabs, separator, scroll-area, skeleton, sonner`.

Existing custom components map onto these:
- `app/_components/ConfirmDialog.tsx` → rebuilt on shadcn **AlertDialog**, keeping the same props
  surface (`open, title, description, confirmLabel, cancelLabel, destructive, onConfirm,
  onCancel`) so callers don't change.
- `app/_components/Toast.tsx` (`ToastProvider` + `useToast`) → replaced by **Sonner**.
  `useToast` callers switch to `toast()` from `sonner`; `<Toaster />` mounts in the admin layout
  and the editor tree. `ToastProvider` and `Toast.tsx` are removed.
- `lib/utils.ts` added with `cn()` (clsx + tailwind-merge).

### 3. Admin (`app/admin/*`)

Top-bar + hub structure kept. The admin layout root carries `data-adv-ui`. Every file loses its
inline styles / CSS module in favour of shadcn components + Tailwind classes:
- `AdminChrome.tsx`, `TopBar.tsx`, `BackLink.tsx`, `LogoutButton.tsx` — restyled; `TopBar` gains
  the `ThemeToggle`. `layout.module.css` + `ui.module.css` deleted.
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
so it follows the light/dark toggle. The editor-chrome root carries `data-adv-ui`; the landing
sections it wraps do **not**, so they stay visually identical. Per file:
- `PublishBar.tsx` — `Button`s, `Badge` (diff chip), status pill; hosts a `ThemeToggle`. Preview
  mode still collapses to the single floating button.
- `StructurePanel.tsx` — `ScrollArea` panel; rows use shadcn primitives.
- `SectionRow.tsx` — `DropdownMenu` for the ⋯ actions, `AlertDialog` for delete.
- `AddSectionMenu.tsx` — `DropdownMenu`.
- `MediaSlot.tsx` + `MediaLibraryPopover.tsx` — `Popover` + `Button` + `Input`; the
  menu/library/url/alt views become clean popover content.
- `TestimonialTypeToggle.tsx` — shadcn `Tabs` or a segmented `Button` group.
- `EditableText.tsx`, `SectionHoverFrame.tsx`, `RepeatableList.tsx` — keep their behaviour;
  inline styles replaced with Tailwind classes / tokens. `RepeatableList`'s `+ Add` and drag
  handles use shadcn `Button` styling. `app/_editor/styles.module.css` is folded into Tailwind
  and deleted.

---

## File-structure impact

**Created:** `components.json`, `postcss.config.mjs`, `lib/utils.ts`, `components/ui/*` (shadcn),
`app/_components/ThemeToggle.tsx`.
**Heavily modified:** `app/globals.css`, `app/layout.tsx`, every file under `app/admin/` and
`app/_editor/`, plus `app/_components/ConfirmDialog.tsx`.
**Deleted:** `app/admin/_components/layout.module.css`, `app/admin/_components/ui.module.css`,
`app/_editor/styles.module.css`, `app/_components/Toast.tsx`.
**Kept untouched:** all of `app/_sections/`, `styles/landing.css`, `styles/colors_and_type.css`,
`app/_styles/tokens.css` (the landing depends on them), all of `lib/`, `types/`, `content/`,
`app/api/`, `middleware.ts`, the audit pipeline, and the test subjects.

## Phasing

Each phase is independently shippable and leaves the app working.

1. **Foundation** — Tailwind + shadcn init, scoped-preflight setup, theme tokens, `next-themes`,
   `ThemeToggle`, `lib/utils.ts`. App still renders; landing verified unchanged.
2. **Shared primitives** — install shadcn components; rebuild `ConfirmDialog` on `AlertDialog`,
   swap `Toast` → Sonner across callers.
3. **Admin** — migrate all `app/admin/*` surfaces; delete the admin CSS modules.
4. **Editor chrome** — migrate all `app/_editor/*`; delete `styles.module.css`.

## Risks & mitigations

- **Preflight leaking onto the landing** — the main risk. Mitigated structurally: preflight is
  scoped to `[data-adv-ui]`, which the landing never has. Phase 1 explicitly verifies the landing
  renders byte-for-byte unchanged before any further work.
- **Theme flash on load** — handled by `next-themes` + `suppressHydrationWarning`.
- **Hydration with `next-themes`** — `ThemeToggle` is a client component; the provider is set up
  per next-themes docs.
- **Editor chrome over a light landing** — in dark mode the chrome is dark over the (light)
  landing; this is intentional and normal for editing chrome.

## Testing & verification

- The 83 existing tests target logic (audit pipeline, content migration, GHL) — not styling — so
  they must stay green after every phase (`npm test`).
- `npx tsc --noEmit` and `npm run build` green after every phase.
- Each phase verified in the browser via the dev server: admin surfaces logged in, editor chrome
  in edit mode — in **both** light and dark modes — and the landing page confirmed visually
  unchanged.

## Out of scope

- The landing page (`app/_sections/*`, `styles/landing.css`) — not restyled, not touched.
- No change to app behaviour, routes, the content schema, the audit pipeline, or auth.
- No new features — this is a styling/design-system migration only.
- No `framer-motion` / JS animation library.
