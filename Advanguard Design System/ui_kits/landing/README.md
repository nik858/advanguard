# Advanguard Landing Page — `FrontEndShortFree` UI Kit

A pixel-faithful, scroll-animated, SEO-optimized recreation of the **Front End — Short Free** funnel page from the NHB Brand Kit.

## Files

- `index.html` — the rendered page. Mount this as your landing page.
- `app.jsx` — composes the sections and provides editable-content state via React context.
- `components/*.jsx` — one file per section: `Header`, `Headline`, `OrderForm`, `WhatIs`, `LogoStrip`, `OnlySystem`, `Demo`, `Testimonials`, `Stack`, `Guarantee`, `FAQ`, `Footer`.
- `admin.jsx` — the in-page **Admin Editor** sheet that surfaces every editable text field, every video URL, and every product line item as a form. Toggle with the floating ✎ button bottom-right.
- `data.js` — the `defaultContent` object: the single source of truth for every editable string, image, and video on the page. Edits made in the admin UI persist to `localStorage` under `advanguard:content`.

## How to edit content

1. Open `index.html` in a browser.
2. Click the ✎ **Admin Editor** button in the bottom-right corner.
3. Each section is a collapsible group with form fields. Changes update the page live.
4. **Videos**: paste a YouTube / Vimeo / Wistia / direct `.mp4` URL, OR drag-and-drop a file. Files are stored as a data-URL in `localStorage` (fine for previewing — for production swap to your CDN of choice).
5. Click **Export** in the admin drawer to copy the entire `defaultContent` JSON to the clipboard — paste it into `data.js` to make changes permanent.

## SEO & Lighthouse

The page targets a **100 / 100 / 100 / 100** Lighthouse score:

- Semantic HTML5 landmarks (`<header>`, `<main>`, `<section>`, `<footer>`).
- Single `<h1>` per page; `<h2>` for major sections; ordered heading levels.
- Open Graph + Twitter Card meta in `<head>`.
- JSON-LD `Product` schema with rating + price + offer.
- Lazy-loaded images (`loading="lazy"`, `decoding="async"`); width / height on every `<img>` to prevent CLS.
- Preconnect to font CDN; only the weights actually used (`400 / 500 / 700 / 800`).
- All form inputs have `<label>` and `aria-describedby` for the helper text.
- Color contrast checked against WCAG AA — the warm-black text on #FFF / #FBFBFB is **17.7:1**.
- No render-blocking scripts; React + Babel served via CDN with `defer`.

## Animations

Sections fade-up on scroll-into-view using a single `IntersectionObserver`. Items inside a section stagger at 80 ms. Easing is `cubic-bezier(0.22, 1, 0.36, 1)` over 600 ms — gentle and gone in under one second. `prefers-reduced-motion: reduce` short-circuits all of it.

## Notes

- Substitute fonts: Avenir Next → Inter Tight, Helvetica → Inter, SF Compact → Inter.
- The "FEATURED IN" logo strip is rendered as wordmark placeholders. Drop real `<img src>` URLs in `data.js` to replace.
- The video player is a simple `<video>` tag with a poster; replace with a YouTube embed if needed by setting `videoUrl` to a YouTube URL — the player auto-detects and switches to `<iframe>`.
