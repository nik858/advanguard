# Advanguard Design System

> Brand & UI kit derived from the **NHB Brand Kit #1 — Base Funnel Template** Figma file.
> Source company: **Advanguard** · Flagship template: **Automatic Clients** sales funnel.

The Advanguard design system codifies the visual language of a direct-response info-product funnel — the kind that sells an eBook for $27 with a long-form sales letter, social proof, a guarantee, and a sticky order form. Everything in the kit is built for **conversion**: blue trust, yellow guarantee, red urgency, green "free", and a generous use of white space punctuated by bold display type.

---

## Sources

- **Figma file:** `NHB Brand Kit #1.fig` (mounted as a virtual filesystem in this project)
  - Page: `Base-Funnel-Template`
  - Focus frame: `components/FrontEndShortFree` → `Frame2734` (the long-form landing page) — node `335:890952`
  - Top recurring components: `Header`, `Headline`, `OrderForm3`, `Frame2741` (logo strip), `Frame2742` (book + features), `Demo`, `Testimonials2`, `Frame2743` (stack of products), `Guarantee`, `FAQ`, `Footer`
- **Brand:** Advanguard
- **Product the template sells (placeholder content):** "Automatic Clients" — a 340-page ebook + bonus stack for $27

---

## Index — what's in this folder

| Path | What it is |
|---|---|
| `README.md` | this file — context, content rules, visual rules, iconography |
| `SKILL.md` | Claude / Claude-Code skill entry-point for invoking this design system |
| `colors_and_type.css` | All design tokens as CSS variables: brand + semantic colors, full type scale, shadows, radii, spacing, layout |
| `assets/` | Real images and icon SVGs lifted from the Figma — hero video thumbnail, iPad mockup, profile placeholder, guarantee badge star, etc. |
| `preview/` | Per-token / per-component preview cards rendered into the Design System tab |
| `ui_kits/landing/` | The full **FrontEndShortFree** landing page rebuilt as a pixel-faithful, scroll-animated, SEO-optimized HTML + JSX kit, with an **admin mode** for editing every copy field and uploading videos |

---

## CONTENT FUNDAMENTALS

The voice of this funnel is **classic direct-response copywriting** — short, punchy, benefit-led, with a heavy reliance on bracketed `[INSERT …]` placeholders that an admin fills in per offer. It does not "sound like a brand"; it sounds like the **product-owner talking to one prospect at a time.**

### Voice & person
- First-person plural ("we put everything we've learned…", "we'll refund you")
- Speaks directly to the reader as "you" — never "users", never "customers" in body copy
- "I" appears only in confessional / founder-story moments ("I know that before I get into anything…")
- Conversational fragments are deliberate ("How's that for a money back guarantee? I'd say pretty good!")

### Tone
- **Confident, slightly contrarian.** "Counterintuitive approach to [DESIRED RESULT]" is a recurring frame.
- **Permission-giving.** "…without [INSERT THINGS THEY WANT TO AVOID]" follows almost every claim — the system removes pain, doesn't add discipline.
- **Urgent but not aggressive.** "Limited Time Special", "Only A Few Days Left", "Now available for instant download" — pressure is on availability, not on the reader.
- **Casually authoritative.** Strikethrough prices, "Save $300.00 today", grandpa anecdotes ("Test drive the car before you drive it off the lot…").

### Casing
- **Title Case For Almost Every Headline.** Every H1, sub-headline, CTA, eyebrow, FAQ question, and even single-line testimonial pull-quotes uses Title Case.
- **Sentence case for body paragraphs and FAQ answers.**
- **ALL-CAPS** is reserved for tiny stripe labels: "NOW AVAILABLE FOR INSTANT DIGITAL DOWNLOAD", "FEATURED IN" logos strip.

### Copywriting formulas you'll see repeatedly
- **"For anyone looking for / to …"** — eyebrow above headline
- **"How we [outcome] [without thing they fear]"** — main H1
- **"On [channel], [channel], and [channel] while at the same time …"** — sub-headline expansion
- **"What is the [PRODUCT]?"** — section title
- **"[PRODUCT] is a counterintuitive approach to [result] that allows you to [benefit] without [pain]. We achieve this by [mechanism] without [thing they want to avoid]. And as a result… this frees you up to [aspiration]."** — the canonical body
- **"Here's Everything You're Getting For Only $[PRICE] Today"** — stack reveal
- **"Your Purchase Is Backed By Our Unconditional Money Back Guarantee"** — guarantee header
- **"Hit Play on The Video"** — video micro-CTA

### Emoji & punctuation
- **No emoji.** None in headlines, body, or CTAs. Trust is built with badges, stars, and price tags — never faces.
- Em-dashes and ellipses are used freely in the founder's "letter" voice.
- "$27.00" is always written with cents — never "$27".
- Curly quotes for testimonial pull-quotes; straight quotes inside form labels.

### Numbers
- Specific, oddly precise: "100-300 customers per day", "5,000+ high-ticket clients", "456 reviews", "340 pages", "21 chapters + 7 bonus".
- Round numbers are reserved for guarantees: "30-day money back", "60-day guarantee".

### Things to keep, things to swap
Anywhere you see `[BRACKETED TEXT]` in a layout, it is an **editable placeholder** that the admin fills in. The visual treatment around it should stay; the words swap. The CMS / admin UI in `ui_kits/landing/` exposes every one of these as a form field.

---

## VISUAL FOUNDATIONS

### Color
A three-axis palette: **trust-blue, urgency-red, reward-green**, all sitting on **off-white surfaces** with **deep-navy text**. Yellow exists only as the guarantee badge.

| Role | Hex / RGB | Used for |
|---|---|---|
| Trust blue | `rgb(28,127,255)` | Primary CTA buttons, link text, brand accent dot, book cover, "AC" pull-quote highlights |
| Trust blue alt | `rgb(28,123,253)` | Stripes ("NOW AVAILABLE…"), order-form border |
| Deep blue (button shadow) | `rgb(25,69,224)` | 1-px hard shadow under primary buttons — gives the "pressable" feel |
| Off-white page | `rgb(251,251,251)` | Body background |
| Alt section bg | `rgb(252,252,255)` | Bluish-white for the "Everything You're Getting" stack |
| Surface white | `rgb(255,255,255)` | All cards, the order form, the header |
| Text primary | `rgb(20,12,12)` | Headlines + body copy (slightly warm black) |
| Text deep-navy | `rgb(6,17,48)` | Product-card titles |
| Text navy-2 | `rgb(35,53,103)` | Card subtitles |
| Text muted | `rgb(57,73,118)` | Card body / descriptions |
| Success green | `rgb(56,210,90)` | "$5.00" / "Free" pills inside stack-list pricing |
| Urgency red | `rgb(255,0,0)` | Strikethrough prices ("Only $327.00") |
| Urgency red 2 | `rgb(236,39,74)` | "Limited Time" eyebrow dot, A4 page header tint |
| Guarantee yellow | `rgb(255,206,30) → rgb(255,224,61)` | Star badge fill (linear gradient top-down) |
| Guarantee yellow soft | `rgba(255,204,57,0.2)` | Yellow callout panel inside the order form |
| Footer dark | `rgb(28,28,28)` | The single dark surface in the entire system |

Tone: warm rather than cool. No purple, no teal, no pink. Greys are derived from text-primary with opacity (`opacity: 0.7`, `0.8`, `0.9`).

### Type
**Inter Tight** for big display headlines (44–48px, bold, -2% tracking) — **Inter** for everything else.

- **H1 / section headers** — Inter Tight Bold 48px / 1.1 line / -0.02em
- **H2 / "What is the [Product]?"** — Inter Tight Bold 44px / 1.1
- **Lead / subtitle** — Inter Regular 24px / 1.4 — text-primary
- **Eyebrow** — Inter Bold 20–22px / 1, **always** preceded by a coloured dot
- **Body** — Inter 18–24px / 1.4
- **Testimonial body** — Inter 16px / 1.5
- **CTA button label** — Inter Bold 24px / 1.2 + a 14px secondary line above ("Get Your eBook Now!")
- **Price (strikethrough/now)** — Barlow Bold 24px in red
- **"Excellent based on N reviews"** — Roboto Medium 16px
- **Guarantee subhead** — Helvetica Bold 24px (the one place a non-Inter sans appears in body copy)

The Figma uses **Avenir Next** in one cluster (the iPad screen overlays — "Fast Track" / "Guaranteed Approval"). It is NOT a webfont; we substitute with **Inter Tight** for the same metrics. Flagged below.

### Backgrounds
- **Almost everything is on white (`#fff`) or off-white (`rgb(251,251,251)`).** No gradients, no full-bleed photography, no patterns.
- **Section dividers are accomplished by switching to `rgb(252,252,255)`** (the stack section) — never by a visible rule or border.
- **One radial diamond gradient** appears inside iPad mockups for visual interest — extracted as `assets/diamond-gradient.png`, used at 20% opacity.
- The book cover is the **only saturated surface** in the page: blue 0→1 vertical gradient (`#006CFF → #2489FF`).

### Animation & scroll
The Figma is static, but the brief asks for **smooth scroll-in animations.** The system prescribes:
- **Fade-up on enter:** sections animate from `opacity 0; translateY(24px)` → `1; 0` over 600ms, `cubic-bezier(0.22, 1, 0.36, 1)`.
- **Stagger** within a section (testimonial grid, stack of products) at 80ms.
- **No bounces, no parallax, no spins.** This is a trust page; motion is gentle and gone in <1s.
- **CTA hover:** brightness `1.05`, transition 150ms. No scale.
- **CTA press:** translateY(1px), shadow collapse to 0. Mimics the 1-px deep-blue shadow becoming a press indent.
- **Card hover:** `transform: translateY(-2px)` + `box-shadow: 0 8px 20px rgba(0,0,0,0.12)`. Optional, off by default.

### Hover & press states
- **Primary CTA hover:** `filter: brightness(1.05)`; **press:** `translateY(1px)` and shadow removed.
- **Link hover:** `opacity: 0.85`. Never a color change.
- **Field focus:** 2px ring of `var(--color-brand-blue-tint)` outside the existing 1-px border.

### Borders & dividers
- **Order form:** 3px solid blue border on a white card — this is the single most distinctive element of the system. Don't reuse it elsewhere.
- **Inputs:** `1px solid rgb(216,216,217)` with an inner shadow `inset 0 2px 2px rgba(0,0,0,0.1)` — a slight "well" look.
- **Cards:** no border; rely on the shadow alone.

### Shadows & elevation
| Token | Use | Value |
|---|---|---|
| `--shadow-header` | Sticky header bar | `0 4px 4px rgba(0,0,0,0.1)` |
| `--shadow-card` | Testimonial / product cards | `0 4px 13px rgba(0,0,0,0.1)` |
| `--shadow-card-soft` | Stack product cards | `0 4px 12px rgba(0,0,0,0.1)` |
| `--shadow-product` | A4-paper stack behind the book | `0 7.9px 19px rgba(0,0,0,0.12)` |
| `--shadow-demo` | Big demo video on white | `0 0 44px rgba(0,0,0,0.2)` |
| `--shadow-cta` | Hard 1-px under the blue button | `0 1px 0 rgb(25,69,224)` |
| `--shadow-input-inset` | Inside email/phone inputs | `inset 0 2px 2px rgba(0,0,0,0.1)` |

### Corner radii
- Inputs / buttons / cards: **8px** or **10px**
- Tiny pill / chip ("$5.00", "Free"): **6px**
- Book / paper: **2–4px**
- Avatars / status dots: **50%**

### Transparency & blur
- The page **does not use backdrop-filter or blur anywhere.**
- Transparency is used:
  - On opacity `0.7 / 0.8 / 0.9` text to imply muted weight (instead of a separate grey).
  - On a 50%-white sticky header laid over the page (`opacity: 0.5` + shadow).
  - On the "marker highlight" behind testimonial words: `rgba(28,127,255,0.3)`.

### Imagery vibe
- **Cool, daylight-clean.** All product mockups are on white. No filters, no grain. iPad / phone / book renders are crisp PNGs with hard shadows. People photos (in testimonials) are warm, well-lit, smiling head-and-shoulders — but always tightly cropped and circular (52px ⌀).

### Layout rules
- **1512-wide canvas, 1140-wide content column**, side gutters of **186px**.
- Hero is a 2-column split: **708px copy** + **378px order form**, gap **54px**.
- Section vertical padding: **32px** above and below for tight sections; **64px** for testimonials / FAQ.
- Cards inside a section sit on a **16px gap** grid.
- Sticky header **64px tall**.
- Footer is dark, **~547px tall**, centered single column.

### Fixed elements
- The header is the only fixed element on desktop; it's translucent (50% white) and casts the only top-of-page shadow.
- The order form is **not actually sticky in the Figma**, but the long left column makes it appear so. In our HTML version we make the right column `position: sticky; top: 84px;` because that is the obvious correct behaviour.

---

## ICONOGRAPHY

The Figma uses very few icons. Approach:

| Icon | Source in Figma | Our copy |
|---|---|---|
| Phone (header "Order By Phone") | `external/ICO24PhoneFill` (Remix Icon) | We use [Remix Icon](https://remixicon.com/) via CDN — `phone-fill` |
| Down-arrow (order-form steps) | `external/IcoRemixSystemArrowDown` (Remix Icon) | Remix Icon `arrow-down-line` |
| Download-cloud (instant access) | inline SVG, Remix Icon shape | Remix Icon `download-cloud-fill` |
| Question mark in a chat bubble (FAQ) | Phosphor "Question" | Phosphor `question` |
| Shield with check (secure checkout) | Phosphor "ShieldCheck" | Phosphor `shield-check` |
| Arrow-right (button) | Phosphor "ArrowRight" | Phosphor `arrow-right` |
| Fast-forward circle (iPad screen) | Phosphor "FastForwardCircle" | Phosphor `fast-forward-circle` |
| Yellow guarantee star | one SVG, copied as `assets/guarantee-star.svg` | Native SVG — kept exactly. |
| 5-star ratings | individual star SVGs in `Star/`, `Star2/`… | Native SVG; we use a single inlined star and repeat. |
| Authority/press logos ("Featured in") | hand-traced VECTOR shapes | We render as **placeholder logos** — text-only with the company name in Inter Bold, grayscale. Real publication logos must be supplied by the customer. |

**Iconography rules**
- **Outline icons in monochrome.** Stroke icons (Remix `*-line`) for nav / metadata; filled icons (Remix `*-fill`, Phosphor regular) for emphasis.
- **20×20** is the default size; **32×32** for the FAQ question chat icon; **18×18** for header inline icons.
- **No emoji ever.** None of the source uses them.
- **No unicode pseudo-icons** (`✓`, `★`, etc.) outside of accessible fallbacks. Stars are SVG.
- **Brand mark is a wordmark** (`YOURLOGO` placeholder — 8-vector path). The customer supplies a real logo at upload-time.

**Substitutions flagged**
- The Figma source contains some fonts that are not webfont-licensable (**Avenir Next**, **Helvetica**, **SF Compact**, **SF Pro**). We substitute with **Inter** / **Inter Tight** for those. The visual rhythm is preserved but tracking on Avenir Next labels ("Fast Track", "Guaranteed Approval") is slightly different.
- Authority press logos in the "Featured in" strip are vector shapes (no name) in the Figma. We render generic capsule placeholders.
- The "100% guarantee badge" inner text glyphs are SVG paths in the Figma; we render `100%` as live text inside the badge for editability and SEO.

---

## How to use this kit

1. Link `colors_and_type.css` from your HTML.
2. Pull in **Inter Tight** + **Inter** from Google Fonts (the CSS file does this for you).
3. Copy a component out of `ui_kits/landing/` and re-skin its `[INSERT…]` placeholders.
4. Keep the heuristic: **white page, off-black text, one blue CTA, one yellow badge, one red urgency mark.** Anything more is off-brand.

