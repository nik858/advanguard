---
name: advanguard-design
description: Use this skill to generate well-branded interfaces and assets for Advanguard (Automatic Clients / NHB Brand Kit), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and a full landing-page UI kit (admin-editable) for prototyping direct-response sales funnels.
user-invocable: true
---

Read the `README.md` file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out of `assets/` and create static HTML files for the user to view. Link `colors_and_type.css` for tokens. If working on production code, copy assets and read the rules in `README.md` to become an expert in designing with this brand.

The flagship reference layout is `ui_kits/landing/index.html` — the **FrontEndShortFree** sales funnel, pixel-recreated, fully scroll-animated, SEO-optimised, with an **admin mode** that lets a non-developer edit every text field, upload videos, and swap product imagery on the fly. Use it as the canonical example of voice, layout cadence, and component composition.

Key reminders for this brand:
- **No emoji, no purple gradients, no decorative SVG illustrations.**
- White page, off-black text, one blue CTA, one yellow guarantee badge, one red urgency dot. That is the whole palette.
- Headlines: **Inter Tight Bold 48 / 1.1 / -0.02em**. Body: **Inter 18–24**.
- Every headline / subhead / CTA / FAQ question uses Title Case. Body paragraphs are sentence case.
- Bracketed `[INSERT …]` text in the Figma is an editable placeholder — surface it as a CMS field, never hard-code it.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions (audience, offer, single landing page vs. funnel step, etc.), and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.
