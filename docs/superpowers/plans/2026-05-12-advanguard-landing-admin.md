# Advanguard Landing + Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrer la landing Advanguard existante (HTML + React-via-CDN) vers Next.js 15, ajouter un admin in-context permettant à Nik (non-technique) d'éditer textes/images/vidéos, persister les modifs via commits GitHub déclenchant un rebuild Vercel.

**Architecture:** Next.js App Router avec rendu SSG pour la landing publique (Server Components lisant `content/content.json`). Mode édition activé par un cookie session JWT. Drafts stockés sur Vercel Blob + localStorage. Publish = commit `content.json` via API GitHub → webhook Vercel → rebuild auto. Médias uploadés via signed URLs Vercel Blob. Leads forwardés vers Inbound Webhook GoHighLevel.

**Tech Stack:** Next.js 15 (App Router) · TypeScript · Zod · Vitest · React Testing Library · Vercel Blob · Vercel KV (Upstash) · jose (JWT) · bcryptjs · @octokit/rest

**Spec source:** [docs/superpowers/specs/2026-05-12-advanguard-landing-admin-design.md](../specs/2026-05-12-advanguard-landing-admin-design.md)

**Original template source:** `Advanguard Design System/ui_kits/landing/` (read-only reference — do not modify)

---

## File Structure

Files created (final state):

```
advanguard/                                  # Next.js project root (sibling of "Advanguard Design System" inside the same parent folder)
├── app/
│   ├── layout.tsx
│   ├── page.tsx                             # Landing publique (Server Component, SSG)
│   ├── globals.css                          # @import landing.css + colors_and_type.css
│   │
│   ├── _sections/                           # Composants landing
│   │   ├── Header.tsx
│   │   ├── Headline.tsx
│   │   ├── Hero.tsx
│   │   ├── OrderForm.tsx                    # Client Component
│   │   ├── LogoStrip.tsx
│   │   ├── OnlySystem.tsx
│   │   ├── Demo.tsx
│   │   ├── Testimonials.tsx
│   │   ├── Stack.tsx
│   │   ├── GuaranteeSection.tsx
│   │   ├── FAQ.tsx
│   │   ├── Footer.tsx
│   │   ├── JsonLd.tsx                       # Safe JSON-LD emitter
│   │   └── _shared/
│   │       ├── Reveal.tsx
│   │       ├── VideoPlayer.tsx
│   │       ├── Icons.tsx
│   │       ├── CTA.tsx
│   │       ├── Book.tsx
│   │       ├── GuaranteeBadge.tsx
│   │       └── Stars.tsx
│   │
│   ├── _editor/                             # UI mode édition
│   │   ├── EditorProvider.tsx
│   │   ├── EditableText.tsx
│   │   ├── Edit.tsx
│   │   ├── MediaSwapButton.tsx
│   │   ├── RepeatableList.tsx
│   │   ├── PublishBar.tsx
│   │   ├── UploadModal.tsx
│   │   ├── LandingTree.tsx
│   │   ├── types.ts
│   │   └── styles.module.css
│   │
│   ├── admin/
│   │   ├── layout.tsx
│   │   ├── login/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── page.tsx
│   │   ├── lead-magnet/page.tsx
│   │   ├── audit/page.tsx
│   │   ├── media/page.tsx
│   │   ├── history/page.tsx
│   │   ├── settings/page.tsx
│   │   └── _components/
│   │       ├── Sidebar.tsx
│   │       └── LogoutButton.tsx
│   │
│   └── api/
│       ├── login/route.ts
│       ├── logout/route.ts
│       ├── publish/route.ts
│       ├── upload/sign/route.ts
│       ├── draft/route.ts
│       ├── deploy-status/route.ts
│       ├── history/route.ts
│       ├── media/route.ts
│       ├── lead/route.ts
│       └── audit/route.ts
│
├── content/
│   ├── content.json
│   └── prompts.json
│
├── lib/
│   ├── auth.ts
│   ├── content.ts
│   ├── github.ts
│   ├── blob.ts
│   ├── ghl.ts
│   └── ratelimit.ts
│
├── types/
│   ├── content.ts
│   └── prompts.ts
│
├── tests/
│   ├── setup.ts
│   ├── lib/{auth,content,github,ghl}.test.ts
│   └── api/{login,lead}.test.ts
│
├── middleware.ts
├── public/assets/
├── styles/
│   ├── colors_and_type.css
│   └── landing.css
│
├── .env.example
├── next.config.ts
├── tsconfig.json
├── vitest.config.ts
└── package.json
```

---

## Phase 1: Bootstrap & visual migration

### Task 1: Initialize git repo and scaffold Next.js

**Files:**
- Create: `.gitignore`, `package.json`, `next.config.ts`, `tsconfig.json`, `app/layout.tsx`, `app/page.tsx`

- [ ] **Step 1: Init git repo at project root**

```bash
cd "/Users/tb/Documents/TB Dev/Advanguard"
git init
```

- [ ] **Step 2: Add base .gitignore for Next.js + Node**

Create `.gitignore`:
```
node_modules
.next
out
.env*.local
.vercel
*.log
.DS_Store
dist
coverage
```

- [ ] **Step 3: Initial commit before scaffold**

```bash
git add .gitignore
git commit -m "chore: init repo with base gitignore"
```

- [ ] **Step 4: Scaffold Next.js into current directory**

```bash
npx create-next-app@latest . --typescript --app --no-tailwind --no-eslint --import-alias "@/*" --src-dir=false --use-npm
```
When prompted "directory not empty", confirm Yes. The "Advanguard Design System" folder is preserved.

- [ ] **Step 5: Verify dev server starts**

```bash
npm run dev
```
Visit http://localhost:3000 → expected: default Next.js page. Stop with Ctrl+C.

- [ ] **Step 6: Commit scaffold**

```bash
git add -A
git commit -m "chore: scaffold Next.js 15 app router + TypeScript"
```

---

### Task 2: Install runtime + dev dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install runtime dependencies**

```bash
npm install zod jose bcryptjs @octokit/rest @vercel/blob @upstash/ratelimit @upstash/redis @vercel/kv
```

- [ ] **Step 2: Install dev dependencies (testing + tooling)**

```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @types/bcryptjs happy-dom
```

- [ ] **Step 3: Configure Vitest**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    globals: true,
    include: ["tests/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
```

- [ ] **Step 4: Create test setup file**

Create `tests/setup.ts`:
```typescript
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 5: Add test scripts to package.json**

In `package.json`, set scripts:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 6: Verify test infrastructure works**

Create `tests/setup.smoke.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
describe("setup", () => {
  it("works", () => { expect(1 + 1).toBe(2); });
});
```

Run: `npm test`. Expected: 1 passed.

Then delete the smoke test:
```bash
rm tests/setup.smoke.test.ts
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: add deps (zod, jose, bcryptjs, octokit, blob, kv) + vitest"
```

---

### Task 3: Copy CSS and assets from design system

**Files:**
- Create: `styles/colors_and_type.css`, `styles/landing.css`, `app/globals.css`
- Copy: `public/assets/*`

- [ ] **Step 1: Copy CSS files**

```bash
mkdir -p styles
cp "Advanguard Design System/colors_and_type.css" styles/colors_and_type.css
cp "Advanguard Design System/ui_kits/landing/landing.css" styles/landing.css
```

- [ ] **Step 2: Copy assets**

```bash
mkdir -p public/assets
cp "Advanguard Design System/assets/"* public/assets/
```

- [ ] **Step 3: Replace default globals.css**

Replace `app/globals.css` with:
```css
@import "../styles/colors_and_type.css";
@import "../styles/landing.css";

.visually-hidden {
  position: absolute !important;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

- [ ] **Step 4: Verify CSS asset paths work**

```bash
grep -nE 'url\(\.\./|url\("\.\./' styles/*.css || echo "no relative URLs found"
```

If any are found, use Edit tool to change each `../../assets/` to `/assets/`.

- [ ] **Step 5: Commit**

```bash
git add styles public/assets app/globals.css
git commit -m "feat: import design system CSS + assets"
```

---

### Task 4: Generate Content types and content.json from data.js

**Files:**
- Create: `types/content.ts`, `content/content.json`, `tests/lib/content.test.ts`

- [ ] **Step 1: Read the original data.js**

Read `Advanguard Design System/ui_kits/landing/data.js` (full file) to understand the exact shape of `window.AC.defaultContent`.

- [ ] **Step 2: Write the Zod schema mirroring data.js exactly**

Create `types/content.ts`:
```typescript
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

export const ContentSchema = z.object({
  meta: z.object({
    title: z.string(),
    description: z.string(),
    brand: z.string(),
    productName: z.string(),
    canonical: z.string(),
    ogImage: MediaRefSchema,
  }),
  header: z.object({
    orderByPhone: z.string(),
    needHelp: z.string(),
    logoLight: MediaRefSchema.nullable(),
    logoDark: MediaRefSchema.nullable(),
    logoText: z.string(),
  }),
  headline: z.object({
    eyebrow: z.string(),
    eyebrowDotColor: z.string(),
    h1: z.string(),
    sub: z.string(),
  }),
  hero: z.object({
    videoLabel: z.string(),
    videoUrl: z.string(),
    videoPoster: MediaRefSchema,
    sectionTitle: z.string(),
    sectionBody: z.string(),
  }),
  order: z.object({
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
    miniTestimonials: z.array(z.object({
      avatar: MediaRefSchema,
      name: z.string(),
      role: z.string(),
      quote: z.string(),
    })),
  }),
  authority: z.object({
    title: z.string(),
    logos: z.array(z.string()),
  }),
  onlySystem: z.object({
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
  }),
  demo: z.object({
    h2: z.string(),
    videoUrl: z.string(),
    videoPoster: MediaRefSchema,
  }),
  testimonials: z.object({
    rating: z.string(),
    h2: z.string(),
    pullQuote: z.string(),
    items: z.array(z.discriminatedUnion("type", [
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
    ])),
  }),
  stack: z.object({
    h2: z.string(),
    bigStackImg: MediaRefSchema,
    items: z.array(z.object({
      kind: z.enum(["book", "ipad"]),
      title: z.string(),
      sub: z.string(),
      body: z.string(),
      access: z.string(),
      priceWas: z.string(),
      priceNow: z.string(),
    })),
    ctaTagline: z.string(),
    ctaLabel: z.string(),
    guaranteeText: z.string(),
  }),
  guarantee: z.object({
    h2: z.string(),
    body: z.string(),
  }),
  faq: z.object({
    h2: z.string(),
    sub: z.string(),
    items: z.array(z.object({ q: z.string(), a: z.string() })),
  }),
  footer: z.object({
    disclaimer: z.string(),
    ctaLabel: z.string(),
    ctaTagline: z.string(),
    earnings: z.string(),
    logoText: z.string(),
    copyright: z.string(),
  }),
});

export type Content = z.infer<typeof ContentSchema>;
```

- [ ] **Step 3: Write test for schema parsing**

Create `tests/lib/content.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { ContentSchema } from "@/types/content";
import contentJson from "@/content/content.json";

describe("ContentSchema", () => {
  it("parses content.json successfully", () => {
    const result = ContentSchema.safeParse(contentJson);
    if (!result.success) console.error(result.error.issues);
    expect(result.success).toBe(true);
  });

  it("rejects content missing required fields", () => {
    const bad = { meta: { title: "x" } };
    expect(ContentSchema.safeParse(bad).success).toBe(false);
  });
});
```

Run: `npm test`. Expected: FAIL (content.json doesn't exist yet).

- [ ] **Step 4: Create content/content.json from data.js**

Copy the `window.AC.defaultContent` object from `Advanguard Design System/ui_kits/landing/data.js` (lines ~11-210) and convert to pure JSON:
- Remove the `window.AC.defaultContent =` assignment
- Convert single-quoted strings to double-quoted
- Convert template literals (backticks with newlines) to regular JSON strings with `\n` escapes
- Replace asset paths `../../assets/X.png` with `/assets/X.png`
- Wrap in `{...}` and save as `content/content.json`

Verify:
```bash
node -e "JSON.parse(require('fs').readFileSync('content/content.json'))"
```
Expected: no output (parses OK).

- [ ] **Step 5: Run schema test**

```bash
npm test
```
Expected: PASS. If Zod rejects fields, align schema or content.json until both match.

- [ ] **Step 6: Commit**

```bash
git add types/content.ts content/content.json tests/lib/content.test.ts
git commit -m "feat: define Content Zod schema + initial content.json from data.js"
```

---

### Task 5: Build shared sub-components

**Files:**
- Create: `app/_sections/_shared/{Icons,Reveal,VideoPlayer,CTA,Book,GuaranteeBadge,Stars}.tsx`

- [ ] **Step 1: Port Icons.tsx**

Create `app/_sections/_shared/Icons.tsx`:
```tsx
export const Icons = {
  Phone: () => (<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 22a18 18 0 0 1-18-18c0-1.1.9-2 2-2h3a1 1 0 0 1 1 .76l1 4.24a1 1 0 0 1-.3 1L7.4 9.4a14 14 0 0 0 7.2 7.2l1.4-1.3a1 1 0 0 1 1-.3l4.24 1a1 1 0 0 1 .76 1V20a2 2 0 0 1-2 2"/></svg>),
  ArrowRight: () => (<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 5l7 7-7 7-1.4-1.4 4.6-4.6H3v-2h14.2L12.6 6.4z"/></svg>),
  Play: () => (<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>),
  Download: () => (<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 8 7-8m-7 16v-2H5v2h14v-2h-7Z"/></svg>),
  Question: () => (<svg viewBox="0 0 256 256" fill="currentColor"><path d="M128 24a104 104 0 1 0 104 104A104.12 104.12 0 0 0 128 24m0 192a88 88 0 1 1 88-88 88.1 88.1 0 0 1-88 88m12-60a12 12 0 1 1-12-12 12 12 0 0 1 12 12m36-72c0 22.06-20 32-32 32a8 8 0 0 1-8-8c0-9.66 10.34-16 16-16a16 16 0 1 0-16-16 8 8 0 0 1-16 0 32 32 0 1 1 64 8Z"/></svg>),
  Star: () => (<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.3 5.82 21l1.64-7.03L2 9.24l7.19-.61L12 2l2.81 6.63 7.19.61-5.46 4.73L18.18 21z"/></svg>),
  Edit: () => (<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z"/></svg>),
  Close: () => (<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>),
  Chevron: () => (<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>),
};
```

- [ ] **Step 2: Port Reveal.tsx (Client Component)**

Create `app/_sections/_shared/Reveal.tsx`:
```tsx
"use client";
import { useEffect, useRef, useState, type ReactNode, type ElementType, type CSSProperties } from "react";

type RevealProps = {
  as?: ElementType;
  delay?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

export function Reveal({ as: Tag = "div", delay = 0, className = "", style = {}, children, ...rest }: RevealProps & Record<string, unknown>) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) { setShown(true); io.disconnect(); }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`reveal ${shown ? "in" : ""} ${className}`}
      style={{ ...style, transitionDelay: `${delay}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
```

- [ ] **Step 3: Port VideoPlayer.tsx (Client Component)**

Create `app/_sections/_shared/VideoPlayer.tsx`:
```tsx
"use client";
import { useCallback, useState } from "react";
import { Icons } from "./Icons";
import { mediaUrl, type MediaRef } from "@/types/content";

function isYouTube(u: string) { return /youtube\.com\/watch|youtu\.be\//.test(u); }
function isVimeo(u: string)   { return /vimeo\.com\//.test(u); }
function youTubeId(u: string) { const m = u.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/); return m ? m[1] : ""; }
function vimeoId(u: string)   { const m = u.match(/vimeo\.com\/(\d+)/); return m ? m[1] : ""; }

export function VideoPlayer({ src, poster, label }: { src: string; poster: MediaRef; label?: string }) {
  const [playing, setPlaying] = useState(false);
  const posterUrl = mediaUrl(poster);
  const onActivate = useCallback(() => { if (src) setPlaying(true); }, [src]);
  const onKey = useCallback((e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && src) { e.preventDefault(); setPlaying(true); }
  }, [src]);

  if (!playing) {
    return (
      <div className="ac-player" role="button" tabIndex={src ? 0 : -1} aria-label={label || "Play video"} onClick={onActivate} onKeyDown={onKey}>
        <img className="ac-player__poster" src={posterUrl} alt={label || "Video preview"} loading="lazy" decoding="async" width={1280} height={720} />
        <div className="ac-player__play"><div className="ac-player__play-icon"><Icons.Play/></div></div>
      </div>
    );
  }
  if (isYouTube(src)) {
    return <iframe src={`https://www.youtube.com/embed/${youTubeId(src)}?autoplay=1&rel=0`} title={label || "Video"} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />;
  }
  if (isVimeo(src)) {
    return <iframe src={`https://player.vimeo.com/video/${vimeoId(src)}?autoplay=1`} title={label || "Video"} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />;
  }
  return <video src={src} poster={posterUrl} controls autoPlay playsInline />;
}
```

- [ ] **Step 4: Port CTA.tsx (Client Component)**

Create `app/_sections/_shared/CTA.tsx`:
```tsx
"use client";
import { Icons } from "./Icons";

export function CTA({ tag, label, compact = false, ariaLabel, onClick }: {
  tag?: string; label: string; compact?: boolean; ariaLabel?: string; onClick?: () => void;
}) {
  return (
    <button className={`ac-cta ${compact ? "ac-cta--compact" : ""}`} type="button" onClick={onClick} aria-label={ariaLabel || label}>
      {tag && <span className="ac-cta__tag">{tag}</span>}
      <span className="ac-cta__label">{label}<span className="ac-cta__arrow"><Icons.ArrowRight/></span></span>
    </button>
  );
}
```

- [ ] **Step 5: Port Book.tsx, GuaranteeBadge.tsx, Stars.tsx**

Create `app/_sections/_shared/Book.tsx`:
```tsx
export function Book({ size = "lg", title = "Automatic Clients", quoteLines = ["Copy & paste automated process", "that allows you to acquire", "customers for free"] }: {
  size?: "lg" | "sm"; title?: string; quoteLines?: string[];
}) {
  const [w1, w2] = title.split(/\s/);
  return (
    <div className={`ac-book ${size === "sm" ? "ac-book--sm" : ""}`} aria-hidden="true">
      <div className="ac-book__title">{w1}<br/>{w2}</div>
      <div className="ac-book__bolt">⚡</div>
      <div className="ac-book__placeholder">
        <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M21 5v14H3V5h18m0-2H3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2m-5 5.5a1.5 1.5 0 1 0 1.5 1.5 1.5 1.5 0 0 0-1.5-1.5M5 17l3.5-4.5 2.5 3 3.5-4.5L19 17H5"/></svg>
      </div>
      <div className="ac-book__quote">{quoteLines.map((l, i) => <span key={i}>{l}</span>)}</div>
      <div className="ac-book__binding"></div>
    </div>
  );
}
```

Create `app/_sections/_shared/GuaranteeBadge.tsx`:
```tsx
export function GuaranteeBadge({ size = 124 }: { size?: number }) {
  return (
    <div className="ac-badge" style={{ width: size, height: size }}>
      <div className="ac-badge__star" style={{ width: "100%", height: "100%" }}></div>
      <div className="ac-badge__pct" style={{ fontSize: size * 0.18 }}>100%</div>
    </div>
  );
}
```

Create `app/_sections/_shared/Stars.tsx`:
```tsx
import { Icons } from "./Icons";

export function Stars({ count = 5 }: { count?: number }) {
  return <>{Array.from({ length: count }).map((_, i) => <Icons.Star key={i} />)}</>;
}
```

- [ ] **Step 6: Commit**

```bash
git add app/_sections/_shared
git commit -m "feat: port shared sub-components (Icons, Reveal, VideoPlayer, CTA, Book, GuaranteeBadge, Stars)"
```

---

### Task 6: Build JsonLd component (XSS-safe)

**Files:**
- Create: `app/_sections/JsonLd.tsx`

- [ ] **Step 1: Implement safe JSON-LD emitter**

Create `app/_sections/JsonLd.tsx`:
```tsx
// Server Component. Escapes `<` to prevent `</script>` injection in JSON content.
function safeJson(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}

export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // Safe: we control `data` and escape `<` chars.
      dangerouslySetInnerHTML={{ __html: safeJson(data) }}
    />
  );
}
```

The escape converts any `<` to `<` inside the JSON string, making it impossible for any content field to break out of the `<script>` tag even if it contains `</script>` literally. This is the standard Next.js pattern for JSON-LD.

- [ ] **Step 2: Commit**

```bash
git add app/_sections/JsonLd.tsx
git commit -m "feat: safe JSON-LD emitter with </script> protection"
```

---

### Task 7: Port landing sections (Header, Headline, Hero, OrderForm)

**Files:**
- Create: `app/_sections/{Header,Headline,Hero,OrderForm}.tsx`

- [ ] **Step 1: Create Header.tsx (Server Component)**

Create `app/_sections/Header.tsx`:
```tsx
import { Icons } from "./_shared/Icons";
import { mediaUrl, type Content } from "@/types/content";

export function Header({ content: c }: { content: Content["header"] }) {
  const logoDarkUrl = mediaUrl(c.logoDark);
  return (
    <header className="ac-header" role="banner">
      <div className="ac-header__left">
        <span className="ac-header__phone"><Icons.Phone/></span>
        <span>{c.orderByPhone}</span>
      </div>
      <a href="#top" className="ac-header__logo-link" aria-label="Advanguard home">
        {logoDarkUrl
          ? <img src={logoDarkUrl} alt="Advanguard" className="ac-header__logo-img" width={160} height={34}/>
          : <span className="ac-header__logo">{c.logoText || "ADVANGUARD"}</span>}
      </a>
      <div className="ac-header__right">{c.needHelp}</div>
    </header>
  );
}
```

- [ ] **Step 2: Create Headline.tsx**

Create `app/_sections/Headline.tsx`:
```tsx
import { Reveal } from "./_shared/Reveal";
import type { Content } from "@/types/content";

export function Headline({ content: c }: { content: Content["headline"] }) {
  return (
    <section className="ac-headline" id="top">
      <Reveal>
        <span className="ac-headline__eyebrow" style={{ ["--dot-color" as string]: c.eyebrowDotColor } as React.CSSProperties}>{c.eyebrow}</span>
      </Reveal>
      <Reveal delay={80}>
        <h1 className="ac-headline__h1">{c.h1}</h1>
      </Reveal>
      <Reveal delay={160}>
        <p className="ac-headline__sub">{c.sub}</p>
      </Reveal>
    </section>
  );
}
```

- [ ] **Step 3: Create OrderForm.tsx (Client Component)**

Create `app/_sections/OrderForm.tsx`:
```tsx
"use client";
import { useState } from "react";
import { CTA } from "./_shared/CTA";
import { GuaranteeBadge } from "./_shared/GuaranteeBadge";
import { Stars } from "./_shared/Stars";
import { mediaUrl, type Content } from "@/types/content";

export function OrderForm({ content: order, onCheckout }: { content: Content["order"]; onCheckout?: () => void }) {
  const [status, setStatus] = useState<"idle" | "busy" | "ok" | "err">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("busy");
    const fd = new FormData(e.currentTarget);
    const body = { email: fd.get("email"), phone: fd.get("phone"), website: fd.get("website") };
    const res = await fetch("/api/lead", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) { setStatus("ok"); onCheckout?.(); }
    else {
      const b = await res.json().catch(() => ({}));
      setErrorMsg(b.error || "Erreur");
      setStatus("err");
    }
  }

  return (
    <aside className="ac-order" aria-label="Order form">
      <div className="ac-order__strip">{order.badge}</div>
      <div className="ac-order__product">
        <div className="ac-order__product-name">{order.productName}</div>
        <div className="ac-order__product-sub">{order.productSubtitle}</div>
      </div>
      <div className="ac-order__inner">
        <div className="ac-order__limited">{order.limitedTime}</div>
        <div className="ac-order__price-row">
          <div>
            <span className="ac-order__price-was">{order.priceWas}</span>
            <span className="ac-order__price">{order.priceNow}</span>
          </div>
          <div className="ac-order__price-sub">{order.priceSubLine}</div>
        </div>
        <p className="ac-order__desc">{order.description}</p>
        <form onSubmit={onSubmit} aria-label="Order">
          <label htmlFor="email" className="visually-hidden">Email</label>
          <input id="email" name="email" type="email" required placeholder="Enter your email" className="ac-order__field" autoComplete="email" />
          <div style={{ height: 9 }}/>
          <label htmlFor="phone" className="visually-hidden">Phone</label>
          <input id="phone" name="phone" type="tel" placeholder="Phone number (for bonuses)" className="ac-order__field" autoComplete="tel" />
          {/* Honeypot: positioned offscreen, bots fill it but humans don't */}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1 }} />
          <div style={{ height: 12 }}/>
          <CTA tag={order.ctaTagline} label={status === "busy" ? "Envoi..." : order.ctaLabel} />
          {status === "err" && <p style={{ color: "#c62828", fontSize: 13, marginTop: 8 }}>{errorMsg}</p>}
          {status === "ok" && <p style={{ color: "#15803d", fontSize: 13, marginTop: 8 }}>Merci, on revient vers vous!</p>}
        </form>
        <div className="ac-order__secure">
          <span className="ac-order__check" aria-hidden="true">✓</span>
          <span>{order.secureText}</span>
        </div>
        <div className="ac-order__guarantee-row">
          <GuaranteeBadge size={64}/>
          <div className="ac-order__guarantee-text">{order.guaranteeText}</div>
        </div>
        <div className="ac-order__rating">
          <span className="ac-order__rating-text">{order.ratingText}</span>
          <span className="ac-order__rating-stars" aria-label="5 out of 5 stars"><Stars/></span>
        </div>
        <div className="ac-order__mini-testimonials">
          {order.miniTestimonials.map((t, i) => (
            <div className="ac-order__mini-card" key={i}>
              <div className="ac-order__mini-avatar" style={{ backgroundImage: `url(${mediaUrl(t.avatar)})` }} aria-hidden="true"/>
              <div>
                <div className="ac-order__mini-name">{t.name}</div>
                <div className="ac-order__mini-role">{t.role}</div>
                <div className="ac-order__mini-quote">&quot;{t.quote}&quot;</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: Create Hero.tsx**

Create `app/_sections/Hero.tsx`:
```tsx
import { Reveal } from "./_shared/Reveal";
import { VideoPlayer } from "./_shared/VideoPlayer";
import { OrderForm } from "./OrderForm";
import type { Content } from "@/types/content";

export function Hero({ hero, order }: { hero: Content["hero"]; order: Content["order"] }) {
  return (
    <section className="ac-hero" aria-labelledby="what-is-h2">
      <div className="ac-hero__grid">
        <div className="ac-hero__copy">
          <Reveal className="ac-hero__video-wrap">
            <div className="ac-hero__video">
              <VideoPlayer src={hero.videoUrl} poster={hero.videoPoster} label={hero.videoLabel}/>
            </div>
            <p className="ac-hero__video-label">{hero.videoLabel}</p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="ac-hero__what-h2" id="what-is-h2">{hero.sectionTitle}</h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="ac-hero__what-body">{hero.sectionBody}</p>
          </Reveal>
        </div>
        <Reveal as="aside" className="ac-order-wrap">
          <OrderForm content={order} />
        </Reveal>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add app/_sections/Header.tsx app/_sections/Headline.tsx app/_sections/Hero.tsx app/_sections/OrderForm.tsx
git commit -m "feat: port Header, Headline, Hero, OrderForm sections"
```

---

### Task 8: Port remaining landing sections (LogoStrip, OnlySystem, Demo, Testimonials, Stack, GuaranteeSection, FAQ, Footer)

**Files:**
- Create: `app/_sections/{LogoStrip,OnlySystem,Demo,Testimonials,Stack,GuaranteeSection,FAQ,Footer}.tsx`

For each section, use `Advanguard Design System/ui_kits/landing/sections.jsx` as reference. Conversion rules:
- Replace `useContent()` with a `content` prop
- Add `"use client"` directive if the section uses event handlers (`onCheckout`, `window.scrollTo`) or `useState`
- Replace `style={{ "--dot-color": ... }}` with `style={{ ["--dot-color" as string]: ... } as React.CSSProperties}`
- Discriminated unions on `t.type` narrow automatically thanks to our Zod schema

- [ ] **Step 1: Port LogoStrip.tsx**

Create `app/_sections/LogoStrip.tsx`:
```tsx
import { Reveal } from "./_shared/Reveal";
import type { Content } from "@/types/content";

export function LogoStrip({ content: c }: { content: Content["authority"] }) {
  return (
    <section className="ac-authority" aria-label="Featured in">
      <Reveal>
        <div className="ac-authority__title">{c.title}</div>
        <div className="ac-authority__row">
          {c.logos.map((l, i) => (
            <Reveal key={i} delay={i * 80} className="ac-authority__logo">{l}</Reveal>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
```

- [ ] **Step 2: Port OnlySystem.tsx (Client Component — uses window.scrollTo)**

Open `sections.jsx` lines 259-315 as reference. Create `app/_sections/OnlySystem.tsx`:
```tsx
"use client";
import { Reveal } from "./_shared/Reveal";
import { CTA } from "./_shared/CTA";
import { Book } from "./_shared/Book";
import { GuaranteeBadge } from "./_shared/GuaranteeBadge";
import type { Content } from "@/types/content";

export function OnlySystem({ content: c, onCheckout }: { content: Content["onlySystem"]; onCheckout?: () => void }) {
  return (
    <section className="ac-only" aria-labelledby="only-h2">
      <div className="ac-only__inner">
        <Reveal className="ac-only__header">
          <span className="ac-headline__eyebrow" style={{ ["--dot-color" as string]: c.eyebrowDotColor } as React.CSSProperties}>{c.eyebrow}</span>
          <h2 className="ac-only__h2" id="only-h2">{c.h2}</h2>
          <p className="ac-only__body">{c.body}</p>
        </Reveal>
        <Reveal className="ac-only__features" delay={120}>
          <div className="ac-only__col ac-only__col--left">
            {c.leftFeatures.map((f, i) => (
              <div key={i}>
                <div className="ac-only__feat-title">{f.title}</div>
                <div className="ac-only__feat-body">{f.body}</div>
              </div>
            ))}
          </div>
          <div className="ac-only__book-stage">
            <div className="ac-only__papers" aria-hidden="true">
              <div className="ac-only__paper ac-only__paper--blue" style={{ transform: "translate(-180px,-10px) rotate(-12deg)" }}><div className="ac-only__paper-bar"></div><div className="ac-only__paper-title">Build A High Performing Team</div><div className="ac-only__paper-body">{Array.from({ length: 9 }).map((_,i) => <div key={i} className="ac-only__paper-line"/>)}</div></div>
              <div className="ac-only__paper ac-only__paper--red"  style={{ transform: "translate(-90px,80px) rotate(-30deg)" }}><div className="ac-only__paper-bar"></div><div className="ac-only__paper-title">Automatic Marketing Machine</div><div className="ac-only__paper-body">{Array.from({ length: 9 }).map((_,i) => <div key={i} className="ac-only__paper-line"/>)}</div></div>
              <div className="ac-only__paper ac-only__paper--red"  style={{ transform: "translate(180px,-10px) rotate(12deg)" }}><div className="ac-only__paper-bar"></div><div className="ac-only__paper-title">7-Figure Digital Business</div><div className="ac-only__paper-body">{Array.from({ length: 9 }).map((_,i) => <div key={i} className="ac-only__paper-line"/>)}</div></div>
              <div className="ac-only__paper ac-only__paper--blue" style={{ transform: "translate(90px,80px) rotate(30deg)" }}><div className="ac-only__paper-bar"></div><div className="ac-only__paper-title">Build A Community</div><div className="ac-only__paper-body">{Array.from({ length: 9 }).map((_,i) => <div key={i} className="ac-only__paper-line"/>)}</div></div>
            </div>
            <div className="ac-only__book"><Book/></div>
          </div>
          <div className="ac-only__col ac-only__col--right">
            {c.rightFeatures.map((f, i) => (
              <div key={i}>
                <div className="ac-only__feat-title">{f.title}</div>
                <div className="ac-only__feat-body">{f.body}</div>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal className="ac-only__stats" delay={160}>
          {c.stats.map((s, i) => (
            <div className="ac-only__stat" key={i}>
              <div className="ac-only__stat-value">{s.value}</div>
              <div className="ac-only__stat-label">{s.label}</div>
            </div>
          ))}
        </Reveal>
        <Reveal className="ac-only__cta-wrap" delay={200}>
          <CTA tag={c.ctaTagline} label={c.ctaLabel} onClick={onCheckout}/>
          <a className="ac-only__cta-sub" href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>{c.ctaSubLink}</a>
          <div className="ac-only__guarantee-row">
            <GuaranteeBadge size={64}/>
            <div className="ac-only__guarantee-text">{c.guaranteeText}</div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Port Demo.tsx**

Create `app/_sections/Demo.tsx`:
```tsx
import { Reveal } from "./_shared/Reveal";
import { VideoPlayer } from "./_shared/VideoPlayer";
import type { Content } from "@/types/content";

export function Demo({ content: c }: { content: Content["demo"] }) {
  return (
    <section className="ac-demo" aria-labelledby="demo-h2">
      <div className="ac-demo__inner">
        <Reveal><h2 className="ac-demo__h2" id="demo-h2">{c.h2}</h2></Reveal>
        <Reveal delay={120}>
          <div className="ac-demo__video">
            <VideoPlayer src={c.videoUrl} poster={c.videoPoster} label="Demo video"/>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Port Testimonials.tsx**

Create `app/_sections/Testimonials.tsx`:
```tsx
import { Reveal } from "./_shared/Reveal";
import { VideoPlayer } from "./_shared/VideoPlayer";
import { Stars } from "./_shared/Stars";
import { mediaUrl, type Content } from "@/types/content";
import type { ReactNode } from "react";

function highlightQuote(quote: string, highlights: string[]): ReactNode {
  if (!highlights || !highlights.length) return quote;
  type Part = { text: string; hl: boolean };
  const parts: Part[] = [{ text: quote, hl: false }];
  for (const h of highlights) {
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p.hl) continue;
      const idx = p.text.toLowerCase().indexOf(h.toLowerCase());
      if (idx >= 0) {
        const before = p.text.slice(0, idx);
        const match = p.text.slice(idx, idx + h.length);
        const after = p.text.slice(idx + h.length);
        parts.splice(i, 1, { text: before, hl: false }, { text: match, hl: true }, { text: after, hl: false });
        break;
      }
    }
  }
  return parts.map((p, i) => p.hl ? <span className="ac-testi-card__hl" key={i}>{p.text}</span> : <span key={i}>{p.text}</span>);
}

export function Testimonials({ content: c }: { content: Content["testimonials"] }) {
  return (
    <section className="ac-testi" aria-labelledby="testi-h2">
      <div className="ac-testi__inner">
        <Reveal className="ac-testi__head">
          <div className="ac-testi__rating">
            <span className="ac-testi__rating-text">{c.rating}</span>
            <span className="ac-testi__rating-stars" aria-label="5 out of 5"><Stars/></span>
          </div>
          <h2 className="ac-testi__h2" id="testi-h2">{c.h2}</h2>
          <p className="ac-testi__pull">{c.pullQuote}</p>
        </Reveal>
        <div className="ac-testi__grid">
          {c.items.map((t, i) => (
            <Reveal className="ac-testi__card" key={i} delay={(i % 3) * 80}>
              {t.type === "video" ? (
                <div className="ac-testi-card ac-testi-card--video">
                  <VideoPlayer src={t.videoUrl} poster={t.videoPoster} label={t.name}/>
                  <div className="ac-testi-card__video-foot">
                    <div className="ac-testi-card__name">{t.name}</div>
                    <div className="ac-testi-card__role">{t.role}</div>
                    <div className="ac-testi-card__video-quote">&quot;{t.quote}&quot;</div>
                  </div>
                </div>
              ) : (
                <div className="ac-testi-card">
                  <div className="ac-testi-card__head">
                    <div className="ac-testi-card__avatar" style={{ backgroundImage: `url(${mediaUrl(t.avatar)})` }} aria-hidden="true"/>
                    <div>
                      <div className="ac-testi-card__name">{t.name}</div>
                      <div className="ac-testi-card__role">{t.role}</div>
                    </div>
                  </div>
                  <div className="ac-testi-card__stars" aria-label="5 stars"><Stars/></div>
                  <p className="ac-testi-card__quote">{highlightQuote(t.quote, t.highlights)}</p>
                </div>
              )}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Port Stack.tsx (Client Component)**

Create `app/_sections/Stack.tsx`:
```tsx
"use client";
import { Reveal } from "./_shared/Reveal";
import { CTA } from "./_shared/CTA";
import { Book } from "./_shared/Book";
import { GuaranteeBadge } from "./_shared/GuaranteeBadge";
import { Icons } from "./_shared/Icons";
import { mediaUrl, type Content } from "@/types/content";

function shortLabel(s: string): string { return s.split(" ").slice(0, 2).join(" "); }

export function Stack({ content: c, onCheckout }: { content: Content["stack"]; onCheckout?: () => void }) {
  return (
    <section className="ac-stack" aria-labelledby="stack-h2">
      <div className="ac-stack__inner">
        <Reveal><h2 className="ac-stack__h2" id="stack-h2">{c.h2}</h2></Reveal>
        <Reveal delay={120}>
          <img className="ac-stack__hero-img" src={mediaUrl(c.bigStackImg)} alt="Everything you're getting in the Automatic Clients bundle" width={800} height={334} loading="lazy" decoding="async"/>
        </Reveal>
        <div className="ac-stack__grid">
          {c.items.map((it, i) => (
            <Reveal key={i} delay={(i % 3) * 80}>
              <div className="ac-stack-card">
                <div className="ac-stack-card__visual">
                  {it.kind === "book"
                    ? <Book size="sm" />
                    : <div className="ac-stack-card__ipad" aria-hidden="true"><div className="ac-stack-card__ipad-label">{shortLabel(it.title)}</div></div>}
                </div>
                <div className="ac-stack-card__title-block">
                  <div className="ac-stack-card__title">{it.title}</div>
                  <div className="ac-stack-card__sub">{it.sub}</div>
                </div>
                <p className="ac-stack-card__body">{it.body}</p>
                <div className="ac-stack-card__foot">
                  <span className="ac-stack-card__access"><Icons.Download/>{it.access}</span>
                  <span className="ac-stack-card__price">
                    <span className="ac-stack-card__price-was">Price: {it.priceWas}</span>
                    <span className="ac-stack-card__price-now">{it.priceNow}</span>
                  </span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal className="ac-only__cta-wrap" delay={200}>
          <CTA tag={c.ctaTagline} label={c.ctaLabel} onClick={onCheckout}/>
          <div className="ac-only__guarantee-row">
            <GuaranteeBadge size={64}/>
            <div className="ac-only__guarantee-text">{c.guaranteeText}</div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Port GuaranteeSection.tsx**

Create `app/_sections/GuaranteeSection.tsx`:
```tsx
import { Reveal } from "./_shared/Reveal";
import { GuaranteeBadge } from "./_shared/GuaranteeBadge";
import type { Content } from "@/types/content";

export function GuaranteeSection({ content: c }: { content: Content["guarantee"] }) {
  return (
    <section className="ac-guarantee" aria-labelledby="guarantee-h2">
      <div className="ac-guarantee__inner">
        <Reveal><GuaranteeBadge size={124}/></Reveal>
        <Reveal delay={80}><h2 className="ac-guarantee__h2" id="guarantee-h2">{c.h2}</h2></Reveal>
        <Reveal delay={140}><div className="ac-guarantee__body" style={{ whiteSpace: "pre-line" }}>{c.body}</div></Reveal>
      </div>
    </section>
  );
}
```

- [ ] **Step 7: Port FAQ.tsx**

Create `app/_sections/FAQ.tsx`:
```tsx
import { Reveal } from "./_shared/Reveal";
import { Icons } from "./_shared/Icons";
import type { Content } from "@/types/content";

export function FAQ({ content: c }: { content: Content["faq"] }) {
  return (
    <section className="ac-faq" aria-labelledby="faq-h2">
      <div className="ac-faq__inner">
        <Reveal className="ac-faq__head">
          <h2 className="ac-faq__h2" id="faq-h2">{c.h2}</h2>
          <p className="ac-faq__sub">{c.sub}</p>
        </Reveal>
        <div className="ac-faq__grid">
          {c.items.map((q, i) => (
            <Reveal className="ac-faq__item" key={i} delay={(i % 2) * 80}>
              <div className="ac-faq__q">
                <span className="ac-faq__q-icon" aria-hidden="true"><Icons.Question/></span>
                <span className="ac-faq__q-text">{q.q}</span>
              </div>
              <p className="ac-faq__a">{q.a}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 8: Port Footer.tsx**

Create `app/_sections/Footer.tsx`:
```tsx
"use client";
import { Reveal } from "./_shared/Reveal";
import { CTA } from "./_shared/CTA";
import { mediaUrl, type Content } from "@/types/content";

export function Footer({ content: c, header: h, onCheckout }: {
  content: Content["footer"];
  header: Content["header"];
  onCheckout?: () => void;
}) {
  const logoLightUrl = mediaUrl(h.logoLight);
  return (
    <footer className="ac-footer" role="contentinfo">
      <div className="ac-footer__inner">
        <Reveal><p className="ac-footer__disclaimer">{c.disclaimer}</p></Reveal>
        <Reveal delay={80} className="ac-footer__stack">
          <CTA tag={c.ctaTagline} label={c.ctaLabel} onClick={onCheckout}/>
        </Reveal>
        <Reveal delay={160}><p className="ac-footer__earnings">{c.earnings}</p></Reveal>
        <Reveal delay={200}>
          {logoLightUrl
            ? <img src={logoLightUrl} alt="Advanguard" className="ac-footer__logo-img" width={180} height={40}/>
            : <span className="ac-footer__logo">{c.logoText}</span>}
        </Reveal>
        <Reveal delay={240}><p className="ac-footer__copy">{c.copyright}</p></Reveal>
      </div>
    </footer>
  );
}
```

- [ ] **Step 9: Commit**

```bash
git add app/_sections
git commit -m "feat: port remaining sections (LogoStrip, OnlySystem, Demo, Testimonials, Stack, GuaranteeSection, FAQ, Footer)"
```

---

### Task 9: Wire root page and layout

**Files:**
- Modify: `app/page.tsx`, `app/layout.tsx`

- [ ] **Step 1: Replace app/layout.tsx**

Replace the file with:
```tsx
import "./globals.css";
import type { Metadata } from "next";
import contentJson from "@/content/content.json";
import { ContentSchema, mediaUrl } from "@/types/content";

const content = ContentSchema.parse(contentJson);

export const metadata: Metadata = {
  title: content.meta.title,
  description: content.meta.description,
  alternates: { canonical: content.meta.canonical },
  openGraph: {
    type: "website",
    siteName: content.meta.brand,
    title: content.meta.title,
    description: content.meta.description,
    images: [mediaUrl(content.meta.ogImage)],
  },
  twitter: { card: "summary_large_image", title: content.meta.title, description: content.meta.description },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="color-scheme" content="light" />
        <meta name="theme-color" content="#ffffff" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <a href="#main" className="visually-hidden">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Replace app/page.tsx**

Replace the file with:
```tsx
import contentJson from "@/content/content.json";
import { ContentSchema, mediaUrl } from "@/types/content";
import { JsonLd } from "./_sections/JsonLd";
import { Header } from "./_sections/Header";
import { Headline } from "./_sections/Headline";
import { Hero } from "./_sections/Hero";
import { LogoStrip } from "./_sections/LogoStrip";
import { OnlySystem } from "./_sections/OnlySystem";
import { Demo } from "./_sections/Demo";
import { Testimonials } from "./_sections/Testimonials";
import { Stack } from "./_sections/Stack";
import { GuaranteeSection } from "./_sections/GuaranteeSection";
import { FAQ } from "./_sections/FAQ";
import { Footer } from "./_sections/Footer";

export default function Home() {
  const c = ContentSchema.parse(contentJson);

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
      price: c.order.priceNow.replace(/[^\d.]/g, ""),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: c.meta.canonical,
    },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: c.faq.items.map((q) => ({
      "@type": "Question",
      name: q.q,
      acceptedAnswer: { "@type": "Answer", text: q.a },
    })),
  };

  return (
    <>
      <JsonLd data={productJsonLd} />
      <JsonLd data={faqJsonLd} />
      <Header content={c.header} />
      <main id="main">
        <Headline content={c.headline} />
        <Hero hero={c.hero} order={c.order} />
        <LogoStrip content={c.authority} />
        <OnlySystem content={c.onlySystem} />
        <Demo content={c.demo} />
        <Testimonials content={c.testimonials} />
        <Stack content={c.stack} />
        <GuaranteeSection content={c.guarantee} />
        <FAQ content={c.faq} />
      </main>
      <Footer content={c.footer} header={c.header} />
    </>
  );
}
```

- [ ] **Step 3: Run dev server and verify visually**

```bash
npm run dev
```
Open http://localhost:3000. In another terminal:
```bash
python3 -m http.server 8080 --directory "Advanguard Design System/ui_kits/landing"
```
Open http://localhost:8080 in another browser tab. Compare side-by-side at desktop 1440px and mobile 375px. Verify in DevTools that DOM structure is identical (same classes, same hierarchy). Note any visual differences.

- [ ] **Step 4: Run build to verify SSG works**

```bash
npm run build
```
Expected: no errors, `/` reported as static. Then `npm start` and reload page → same visual output.

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx app/page.tsx
git commit -m "feat: wire root page rendering all sections from content.json with SSG"
```

---

## Phase 2: Auth + middleware

### Task 10: Build auth library

**Files:**
- Create: `lib/auth.ts`, `tests/lib/auth.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/lib/auth.test.ts`:
```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { hashPassword, verifyPassword, signSession, verifySession } from "@/lib/auth";

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-at-least-32-chars-long-xxxxxxxxx";
});

describe("password", () => {
  it("hash and verify round-trip", async () => {
    const hash = await hashPassword("hunter2");
    expect(await verifyPassword("hunter2", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});

describe("session JWT", () => {
  it("sign and verify round-trip", async () => {
    const token = await signSession({ sub: "nik" });
    const payload = await verifySession(token);
    expect(payload?.sub).toBe("nik");
  });

  it("rejects tampered tokens", async () => {
    const token = await signSession({ sub: "nik" });
    const tampered = token.slice(0, -3) + "AAA";
    expect(await verifySession(tampered)).toBeNull();
  });

  it("returns null for malformed tokens", async () => {
    expect(await verifySession("not-a-jwt")).toBeNull();
    expect(await verifySession("")).toBeNull();
  });
});
```

Run: `npm test`. Expected: FAIL (module not found).

- [ ] **Step 2: Implement lib/auth.ts**

Create `lib/auth.ts`:
```typescript
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const SESSION_COOKIE = "__adv_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) throw new Error("JWT_SECRET must be set and >=32 chars");
  return new TextEncoder().encode(s);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export type SessionPayload = { sub: string };

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ sub: payload.sub })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string") return null;
    return { sub: payload.sub };
  } catch {
    return null;
  }
}

export const SESSION_CONFIG = {
  cookieName: SESSION_COOKIE,
  maxAgeSeconds: SESSION_TTL_SECONDS,
};
```

- [ ] **Step 3: Run tests**

```bash
npm test -- tests/lib/auth.test.ts
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/auth.ts tests/lib/auth.test.ts
git commit -m "feat(auth): bcrypt hash + JWT sign/verify with jose"
```

---

### Task 11: Build rate limiter

**Files:**
- Create: `lib/ratelimit.ts`

- [ ] **Step 1: Implement lib/ratelimit.ts**

Create `lib/ratelimit.ts`:
```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
  ? new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    })
  : null;

export const loginLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(5, "15 m"), prefix: "adv:login" })
  : null;

export const leadLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(20, "1 h"), prefix: "adv:lead" })
  : null;

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown";
}

export async function checkLimit(limiter: Ratelimit | null, key: string): Promise<{ success: boolean; remaining: number }> {
  if (!limiter) return { success: true, remaining: Infinity }; // dev fallback without KV
  const r = await limiter.limit(key);
  return { success: r.success, remaining: r.remaining };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/ratelimit.ts
git commit -m "feat(auth): rate limiter via Upstash KV (dev-fallback noop)"
```

---

### Task 12: Login + logout API routes

**Files:**
- Create: `app/api/login/route.ts`, `app/api/logout/route.ts`, `tests/api/login.test.ts`

- [ ] **Step 1: Write failing test for login**

Create `tests/api/login.test.ts`:
```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { POST as login } from "@/app/api/login/route";
import { hashPassword } from "@/lib/auth";

beforeAll(async () => {
  process.env.JWT_SECRET = "test-secret-at-least-32-chars-long-xxxxxxxxx";
  process.env.ADMIN_PASSWORD_HASH = await hashPassword("correct");
});

function mkReq(body: unknown): Request {
  return new Request("http://localhost/api/login", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "127.0.0.1" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/login", () => {
  it("accepts correct password and sets cookie", async () => {
    const res = await login(mkReq({ password: "correct" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie") || "").toMatch(/__adv_session=/);
  });

  it("rejects wrong password", async () => {
    const res = await login(mkReq({ password: "nope" }));
    expect(res.status).toBe(401);
  });

  it("rejects missing password", async () => {
    const res = await login(mkReq({}));
    expect(res.status).toBe(400);
  });
});
```

Run: `npm test`. Expected: FAIL.

- [ ] **Step 2: Implement /api/login/route.ts**

Create `app/api/login/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyPassword, signSession, SESSION_CONFIG } from "@/lib/auth";
import { checkLimit, clientIp, loginLimiter } from "@/lib/ratelimit";

const BodySchema = z.object({ password: z.string().min(1) });

export async function POST(req: Request) {
  const ip = clientIp(req);
  const limit = await checkLimit(loginLimiter, ip);
  if (!limit.success) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Missing password" }, { status: 400 });

  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

  const ok = await verifyPassword(parsed.data.password, hash);
  if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const token = await signSession({ sub: "nik" });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_CONFIG.cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_CONFIG.maxAgeSeconds,
  });
  return res;
}
```

- [ ] **Step 3: Implement /api/logout/route.ts**

Create `app/api/logout/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { SESSION_CONFIG } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_CONFIG.cookieName, "", { path: "/", maxAge: 0 });
  return res;
}
```

- [ ] **Step 4: Run tests**

```bash
npm test
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/login app/api/logout tests/api/login.test.ts
git commit -m "feat(auth): /api/login + /api/logout routes with rate limit"
```

---

### Task 13: Middleware protecting /admin/* and signaling edit mode on /

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: Implement middleware.ts**

Create `middleware.ts` at project root:
```typescript
import { NextResponse, type NextRequest } from "next/server";
import { verifySession, SESSION_CONFIG } from "@/lib/auth";

export const config = {
  matcher: ["/admin/:path*", "/"],
};

export async function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const token = req.cookies.get(SESSION_CONFIG.cookieName)?.value;
  const session = token ? await verifySession(token) : null;

  if (url.pathname.startsWith("/admin")) {
    if (url.pathname === "/admin/login") return NextResponse.next();
    if (!session) {
      const loginUrl = new URL("/admin/login", req.url);
      loginUrl.searchParams.set("next", url.pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // For "/", inject a header indicating edit mode availability
  const res = NextResponse.next();
  if (session) res.headers.set("x-adv-edit-mode", "1");
  return res;
}
```

- [ ] **Step 2: Build smoke check**

```bash
npm run build
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat(auth): middleware protecting /admin/* + edit-mode header on /"
```

---

### Task 14: Admin login page + admin layout shell

**Files:**
- Create: `app/admin/layout.tsx`, `app/admin/login/layout.tsx`, `app/admin/login/page.tsx`, `app/admin/page.tsx`, `app/admin/_components/Sidebar.tsx`, `app/admin/_components/LogoutButton.tsx`, stubs for other admin pages

- [ ] **Step 1: Create login layout (override admin layout for /admin/login)**

Create `app/admin/login/layout.tsx`:
```tsx
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

- [ ] **Step 2: Create login page**

Create `app/admin/login/page.tsx`:
```tsx
"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/admin";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (res.ok) router.replace(next);
    else if (res.status === 429) setError("Trop de tentatives, réessayez dans 15 minutes.");
    else setError("Mot de passe incorrect.");
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#fbfbfb" }}>
      <form onSubmit={onSubmit} style={{ width: "100%", maxWidth: 360, padding: 32, background: "#fff", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,.06)" }}>
        <h1 style={{ fontSize: 22, margin: "0 0 16px" }}>Connexion admin</h1>
        <label htmlFor="pw" style={{ fontSize: 13, fontWeight: 600 }}>Mot de passe</label>
        <input id="pw" type="password" autoFocus required value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%", padding: "10px 12px", marginTop: 6, border: "1px solid #ddd", borderRadius: 8 }} />
        {error && <p style={{ color: "#c62828", fontSize: 13, marginTop: 12 }}>{error}</p>}
        <button type="submit" disabled={busy} style={{ width: "100%", padding: "10px 12px", marginTop: 16, background: "#1c7bfd", color: "#fff", border: 0, borderRadius: 8, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>
          {busy ? "Connexion..." : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Create Sidebar component**

Create `app/admin/_components/Sidebar.tsx`:
```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin", label: "Landing Page", icon: "📄" },
  { href: "/admin/lead-magnet", label: "Lead Magnet", icon: "📝" },
  { href: "/admin/audit", label: "AI Audit", icon: "🤖" },
  { href: "/admin/media", label: "Médiathèque", icon: "🖼" },
  { href: "/admin/history", label: "Historique", icon: "🕓" },
  { href: "/admin/settings", label: "Réglages", icon: "⚙" },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <nav style={{ width: 240, background: "#0f172a", color: "#e2e8f0", padding: 20, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>ADVANGUARD</div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1 }}>
        {items.map((it) => {
          const active = path === it.href;
          return (
            <li key={it.href}>
              <Link href={it.href} style={{ display: "flex", gap: 10, padding: "10px 12px", borderRadius: 8, color: "inherit", textDecoration: "none", background: active ? "#1e293b" : "transparent" }}>
                <span aria-hidden>{it.icon}</span>
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
```

- [ ] **Step 4: Create LogoutButton**

Create `app/admin/_components/LogoutButton.tsx`:
```tsx
"use client";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/admin/login");
  }
  return <button onClick={logout} style={{ background: "transparent", color: "#e2e8f0", border: 0, padding: 8, cursor: "pointer", textAlign: "left" }}>Se déconnecter</button>;
}
```

- [ ] **Step 5: Create admin layout**

Create `app/admin/layout.tsx`:
```tsx
import { Sidebar } from "./_components/Sidebar";
import { LogoutButton } from "./_components/LogoutButton";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <Sidebar />
      <div style={{ background: "#fff" }}>
        <header style={{ display: "flex", justifyContent: "flex-end", padding: 16, borderBottom: "1px solid #eee" }}>
          <LogoutButton />
        </header>
        <main style={{ padding: 32 }}>{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create admin home and stubs**

Create `app/admin/page.tsx`:
```tsx
import Link from "next/link";

export default function AdminHome() {
  return (
    <div>
      <h1 style={{ fontSize: 28, margin: "0 0 8px" }}>Bienvenue, Nik 👋</h1>
      <p style={{ color: "#475569", marginBottom: 24 }}>Édite ta landing page directement depuis le site, ou utilise les outils du panneau de gauche.</p>
      <Link href="/" style={{ display: "inline-block", background: "#1c7bfd", color: "#fff", padding: "12px 20px", borderRadius: 8, textDecoration: "none", fontWeight: 600 }}>
        Éditer la landing →
      </Link>
    </div>
  );
}
```

Create stub pages with minimal placeholder content (5 files, same pattern):

`app/admin/lead-magnet/page.tsx`:
```tsx
export default function LeadMagnetPage() {
  return <div><h1>Lead Magnet</h1><p>Configuration du formulaire de capture (à venir).</p></div>;
}
```

`app/admin/audit/page.tsx`:
```tsx
export default function AuditPage() {
  return <div><h1>AI Audit</h1><p>Disponible en v1.1.</p></div>;
}
```

`app/admin/media/page.tsx`:
```tsx
export default function MediaPage() {
  return <div><h1>Médiathèque</h1><p>Liste des médias uploadés (à venir).</p></div>;
}
```

`app/admin/history/page.tsx`:
```tsx
export default function HistoryPage() {
  return <div><h1>Historique des publications</h1><p>(à venir)</p></div>;
}
```

`app/admin/settings/page.tsx`:
```tsx
export default function SettingsPage() {
  return <div><h1>Réglages</h1><p>(à venir)</p></div>;
}
```

- [ ] **Step 7: Manual smoke test**

Generate a password hash for testing:
```bash
node -e "require('bcryptjs').hash('test123', 12).then(h => console.log(h))"
```

Create `.env.local`:
```
JWT_SECRET=local-dev-secret-at-least-32-chars-long-xxxxx
ADMIN_PASSWORD_HASH=<paste hash here>
```

Then:
```bash
npm run dev
```
- Visit http://localhost:3000/admin → expect redirect to `/admin/login`
- Submit wrong password → expect error
- Submit `test123` → expect redirect to `/admin`, sidebar visible
- Click "Se déconnecter" → expect redirect to login

- [ ] **Step 8: Commit**

```bash
git add app/admin
git commit -m "feat(admin): login page, sidebar layout, stub pages"
```

---

## Phase 3: In-context editor

### Task 15: EditorProvider with draft store

**Files:**
- Create: `app/_editor/types.ts`, `app/_editor/EditorProvider.tsx`

- [ ] **Step 1: Create types**

Create `app/_editor/types.ts`:
```typescript
import type { Content } from "@/types/content";

export type EditorState = {
  draft: Content;
  baseline: Content;
  dirty: boolean;
  publishing: boolean;
  lastSaveAt: number | null;
};

export type EditorAction =
  | { type: "set"; path: string; value: unknown }
  | { type: "reset" }
  | { type: "setDraft"; draft: Content };
```

- [ ] **Step 2: Create EditorProvider**

Create `app/_editor/EditorProvider.tsx`:
```tsx
"use client";
import { createContext, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import type { Content } from "@/types/content";
import type { EditorState, EditorAction } from "./types";

const STORAGE_KEY = "adv:draft:v1";

function setByPath(obj: unknown, path: string, value: unknown): unknown {
  if (!path) return value;
  const parts = path.split(".").map((p) => p.match(/^\d+$/) ? Number(p) : p);
  const root: any = Array.isArray(obj) ? [...obj] : { ...(obj as object) };
  let cur: any = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    const next = cur[k];
    cur[k] = Array.isArray(next) ? [...next] : { ...next };
    cur = cur[k];
  }
  cur[parts[parts.length - 1]] = value;
  return root;
}

function reducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "set": {
      const next = setByPath(state.draft, action.path, action.value) as Content;
      return { ...state, draft: next, dirty: JSON.stringify(next) !== JSON.stringify(state.baseline) };
    }
    case "reset":
      return { ...state, draft: state.baseline, dirty: false };
    case "setDraft":
      return { ...state, draft: action.draft, dirty: JSON.stringify(action.draft) !== JSON.stringify(state.baseline) };
  }
}

type EditorContextValue = {
  state: EditorState;
  setField: (path: string, value: unknown) => void;
  resetDraft: () => void;
  publish: () => Promise<{ ok: true; commit_sha?: string } | { ok: false; error: string }>;
};

const Ctx = createContext<EditorContextValue | null>(null);
export const useEditor = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useEditor outside EditorProvider");
  return v;
};

export function EditorProvider({ initial, children }: { initial: Content; children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    draft: initial,
    baseline: initial,
    dirty: false,
    publishing: false,
    lastSaveAt: null,
  });

  // Load draft from localStorage on mount, then merge server-side draft if exists
  useEffect(() => {
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
  }, []);

  // Save to localStorage on every change
  useEffect(() => {
    if (state.dirty) localStorage.setItem(STORAGE_KEY, JSON.stringify(state.draft));
    else localStorage.removeItem(STORAGE_KEY);
  }, [state.draft, state.dirty]);

  // Debounced save to server (Vercel Blob)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!state.dirty) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch("/api/draft", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ draft: state.draft }),
      }).catch(() => {});
    }, 5000);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [state.draft, state.dirty]);

  const value = useMemo<EditorContextValue>(() => ({
    state,
    setField: (path, value) => dispatch({ type: "set", path, value }),
    resetDraft: () => {
      dispatch({ type: "reset" });
      localStorage.removeItem(STORAGE_KEY);
      fetch("/api/draft", { method: "DELETE" }).catch(() => {});
    },
    publish: async () => {
      const res = await fetch("/api/publish", { method: "POST" });
      if (res.ok) {
        const body = await res.json();
        localStorage.removeItem(STORAGE_KEY);
        return { ok: true, commit_sha: body.commit_sha };
      }
      const err = await res.json().catch(() => ({ error: "Erreur inconnue" }));
      return { ok: false, error: err.error || "Erreur" };
    },
  }), [state]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
```

- [ ] **Step 3: Commit**

```bash
git add app/_editor/EditorProvider.tsx app/_editor/types.ts
git commit -m "feat(editor): EditorProvider with localStorage + Blob autosave"
```

---

### Task 16: Draft API route (Vercel Blob)

**Files:**
- Create: `lib/blob.ts`, `app/api/draft/route.ts`

- [ ] **Step 1: Build lib/blob.ts**

Create `lib/blob.ts`:
```typescript
import { put, list, del } from "@vercel/blob";

export const DRAFT_KEY = "drafts/nik.json";

export async function saveDraft(draft: unknown): Promise<void> {
  await put(DRAFT_KEY, JSON.stringify(draft), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export async function loadDraft(): Promise<unknown | null> {
  try {
    const { blobs } = await list({ prefix: DRAFT_KEY });
    const match = blobs.find((b) => b.pathname === DRAFT_KEY);
    if (!match) return null;
    const r = await fetch(match.url, { cache: "no-store" });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

export async function deleteDraft(): Promise<void> {
  try {
    const { blobs } = await list({ prefix: DRAFT_KEY });
    for (const b of blobs) if (b.pathname === DRAFT_KEY) await del(b.url);
  } catch { /* ignore */ }
}

export async function listMedia(): Promise<{ pathname: string; url: string; size: number; uploadedAt: string }[]> {
  const { blobs } = await list({ prefix: "media/" });
  return blobs.map((b) => ({ pathname: b.pathname, url: b.url, size: b.size, uploadedAt: b.uploadedAt.toISOString() }));
}
```

- [ ] **Step 2: Implement /api/draft route**

Create `app/api/draft/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySession, SESSION_CONFIG } from "@/lib/auth";
import { cookies } from "next/headers";
import { saveDraft, loadDraft, deleteDraft } from "@/lib/blob";
import { ContentSchema } from "@/types/content";

async function requireSession() {
  const c = await cookies();
  const token = c.get(SESSION_CONFIG.cookieName)?.value;
  return token ? await verifySession(token) : null;
}

export async function GET() {
  if (!(await requireSession())) return new NextResponse("Unauthorized", { status: 401 });
  const draft = await loadDraft();
  return NextResponse.json({ draft });
}

const PutBody = z.object({ draft: z.unknown() });
export async function PUT(req: Request) {
  if (!(await requireSession())) return new NextResponse("Unauthorized", { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = PutBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const draftCheck = ContentSchema.safeParse(parsed.data.draft);
  if (!draftCheck.success) return NextResponse.json({ error: "Invalid content shape", issues: draftCheck.error.issues }, { status: 400 });
  await saveDraft(draftCheck.data);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  if (!(await requireSession())) return new NextResponse("Unauthorized", { status: 401 });
  await deleteDraft();
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/blob.ts app/api/draft
git commit -m "feat(editor): /api/draft GET/PUT/DELETE backed by Vercel Blob"
```

---

### Task 17: EditableText + Edit + RepeatableList primitives

**Files:**
- Create: `app/_editor/EditableText.tsx`, `app/_editor/Edit.tsx`, `app/_editor/RepeatableList.tsx`, `app/_editor/styles.module.css`

- [ ] **Step 1: Create editor styles**

Create `app/_editor/styles.module.css`:
```css
.editable {
  outline: 1px dashed transparent;
  outline-offset: 4px;
  cursor: text;
  transition: outline-color 120ms;
}
.editable:hover { outline-color: rgba(28,123,253,.4); }
.editable[data-editing="true"] {
  outline: 2px solid #1c7bfd;
  outline-offset: 4px;
  background: rgba(28,123,253,.04);
}
.itemWrap { position: relative; }
.itemRemove {
  position: absolute; top: -8px; right: -8px;
  background: #fff; border: 1px solid #ddd; border-radius: 999px;
  width: 24px; height: 24px; display: grid; place-items: center;
  cursor: pointer; opacity: 0; transition: opacity 120ms;
  z-index: 5;
}
.itemWrap:hover .itemRemove { opacity: 1; }
.addItem {
  display: block; margin: 12px auto;
  background: #fff; border: 1px dashed #1c7bfd; color: #1c7bfd;
  border-radius: 8px; padding: 8px 16px; cursor: pointer; font: inherit;
}
```

- [ ] **Step 2: Build EditableText**

Create `app/_editor/EditableText.tsx`:
```tsx
"use client";
import { useEffect, useRef, useState, type ElementType } from "react";
import { useEditor } from "./EditorProvider";
import styles from "./styles.module.css";

export function EditableText({
  path,
  as: Tag = "span",
  className = "",
  multiline = false,
  children,
}: {
  path: string;
  as?: ElementType;
  className?: string;
  multiline?: boolean;
  children?: React.ReactNode;
}) {
  const { state, setField } = useEditor();
  const ref = useRef<HTMLElement | null>(null);
  const [editing, setEditing] = useState(false);

  const value: string = path.split(".").reduce<any>(
    (acc, k) => acc?.[k.match(/^\d+$/) ? Number(k) : k],
    state.draft,
  ) ?? "";

  useEffect(() => { if (editing && ref.current) ref.current.focus(); }, [editing]);

  function onBlur() {
    setEditing(false);
    const next = (ref.current?.innerText || "").replace(/\r\n/g, "\n");
    if (next !== value) setField(path, next);
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") (e.currentTarget as HTMLElement).blur();
    if (!multiline && e.key === "Enter") { e.preventDefault(); (e.currentTarget as HTMLElement).blur(); }
  }

  return (
    <Tag
      ref={ref}
      className={`${className} ${styles.editable}`}
      data-editing={editing ? "true" : "false"}
      contentEditable={editing}
      suppressContentEditableWarning
      tabIndex={0}
      onClick={() => setEditing(true)}
      onBlur={onBlur}
      onKeyDown={onKey}
      style={{ whiteSpace: multiline ? "pre-line" : undefined }}
    >
      {editing ? value : (children ?? value)}
    </Tag>
  );
}
```

- [ ] **Step 3: Build Edit wrapper**

Create `app/_editor/Edit.tsx`:
```tsx
"use client";
import type { ElementType, ReactNode } from "react";
import { EditableText } from "./EditableText";

export function Edit({
  edit,
  path,
  as,
  className,
  multiline,
  children,
}: {
  edit: boolean;
  path: string;
  as?: ElementType;
  className?: string;
  multiline?: boolean;
  children: ReactNode;
}) {
  if (!edit) return <>{children}</>;
  return <EditableText path={path} as={as} className={className} multiline={multiline}>{children}</EditableText>;
}
```

- [ ] **Step 4: Build RepeatableList**

Create `app/_editor/RepeatableList.tsx`:
```tsx
"use client";
import { type ReactNode } from "react";
import { useEditor } from "./EditorProvider";
import styles from "./styles.module.css";

export function RepeatableList({
  path,
  newItem,
  children,
}: {
  path: string;
  newItem: unknown;
  children: (i: number) => ReactNode;
}) {
  const { state, setField } = useEditor();
  const arr: unknown[] = path.split(".").reduce<any>(
    (acc, k) => acc?.[k.match(/^\d+$/) ? Number(k) : k],
    state.draft,
  ) ?? [];

  function add() { setField(path, [...arr, newItem]); }
  function remove(i: number) { setField(path, arr.filter((_, idx) => idx !== i)); }

  return (
    <>
      {arr.map((_, i) => (
        <div key={i} className={styles.itemWrap}>
          <button className={styles.itemRemove} type="button" onClick={() => remove(i)} aria-label="Supprimer">×</button>
          {children(i)}
        </div>
      ))}
      <button className={styles.addItem} type="button" onClick={add}>+ Ajouter</button>
    </>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add app/_editor/EditableText.tsx app/_editor/Edit.tsx app/_editor/RepeatableList.tsx app/_editor/styles.module.css
git commit -m "feat(editor): EditableText + Edit + RepeatableList primitives"
```

---

### Task 18: PublishBar with publish action, dirty counter, deploy status polling

**Files:**
- Create: `app/_editor/PublishBar.tsx`

- [ ] **Step 1: Implement PublishBar**

Create `app/_editor/PublishBar.tsx`:
```tsx
"use client";
import { useState } from "react";
import { useEditor } from "./EditorProvider";

function countDiff(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (typeof a !== typeof b) return 1;
  if (Array.isArray(a) && Array.isArray(b)) {
    let n = Math.abs(a.length - b.length);
    const min = Math.min(a.length, b.length);
    for (let i = 0; i < min; i++) n += countDiff(a[i], b[i]);
    return n;
  }
  if (a && b && typeof a === "object") {
    const keys = new Set([...Object.keys(a as object), ...Object.keys(b as object)]);
    let n = 0;
    for (const k of keys) n += countDiff((a as any)[k], (b as any)[k]);
    return n;
  }
  return 1;
}

export function PublishBar() {
  const { state, resetDraft, publish } = useEditor();
  const [status, setStatus] = useState<null | { ok: boolean; msg: string }>(null);
  const [busy, setBusy] = useState(false);
  const diffs = countDiff(state.draft, state.baseline);

  async function onPublish() {
    setBusy(true); setStatus(null);
    const r = await publish();
    if (!r.ok) {
      setBusy(false);
      setStatus({ ok: false, msg: r.error });
      return;
    }
    setStatus({ ok: true, msg: "Build en cours…" });
    const sha = r.commit_sha;
    if (!sha) { setBusy(false); setStatus({ ok: true, msg: "✓ Commit publié" }); return; }
    const deadline = Date.now() + 120_000;
    const poll = async () => {
      const res = await fetch(`/api/deploy-status?sha=${sha}`);
      if (res.ok) {
        const body = await res.json();
        if (body.state === "READY") { setBusy(false); setStatus({ ok: true, msg: "✓ Site en ligne" }); return; }
        if (body.state === "ERROR" || body.state === "CANCELED") { setBusy(false); setStatus({ ok: false, msg: "Build échoué — voir Vercel" }); return; }
      }
      if (Date.now() > deadline) { setBusy(false); setStatus({ ok: true, msg: "✓ Commit publié (timeout polling)" }); return; }
      setTimeout(poll, 3000);
    };
    setTimeout(poll, 3000);
  }

  async function onCancel() {
    if (!confirm("Annuler toutes les modifications non publiées ?")) return;
    resetDraft();
    setStatus(null);
  }

  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 100,
      background: "#0f172a", color: "#fff",
      padding: "10px 16px", display: "flex", alignItems: "center", gap: 16,
      fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 14,
    }}>
      <span>🟢 Mode édition</span>
      <span style={{ opacity: 0.7 }}>•</span>
      <span><b>{diffs}</b> modif{diffs > 1 ? "s" : ""} non publiée{diffs > 1 ? "s" : ""}</span>
      <div style={{ flex: 1 }} />
      {status && <span style={{ background: status.ok ? "#15803d" : "#b91c1c", padding: "4px 10px", borderRadius: 999 }}>{status.msg}</span>}
      <button onClick={onCancel} disabled={busy || !state.dirty} style={{ background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,.3)", padding: "6px 12px", borderRadius: 6, cursor: state.dirty ? "pointer" : "not-allowed", opacity: state.dirty ? 1 : 0.5 }}>Annuler</button>
      <button onClick={onPublish} disabled={busy || !state.dirty} style={{ background: "#1c7bfd", color: "#fff", border: 0, padding: "8px 16px", borderRadius: 6, cursor: state.dirty ? "pointer" : "not-allowed", opacity: state.dirty ? 1 : 0.5, fontWeight: 600 }}>{busy ? "Publication..." : "Publier"}</button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/_editor/PublishBar.tsx
git commit -m "feat(editor): publish bar with diff counter, cancel, publish + deploy polling"
```

---

### Task 19: Wrap sections with editable wrappers (edit prop) and build LandingTree

**Files:**
- Modify: each `app/_sections/*.tsx`
- Create: `app/_editor/LandingTree.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Add `edit?: boolean` prop and Edit wrappers to all sections**

For each section, add a `edit?: boolean` prop (default `false`). For every text rendered as `{c.field}`, wrap with `<Edit edit={edit} path="sectionName.field" as="..." className="...">{c.field}</Edit>`. For array items, use `<Edit edit={edit} path={\`sectionName.items.${i}.field\`} ...>`.

Sections to update with paths (apply to all text leaves):
- `Header.tsx`: `header.orderByPhone`, `header.needHelp`
- `Headline.tsx`: `headline.eyebrow`, `headline.h1`, `headline.sub`
- `Hero.tsx`: `hero.videoLabel`, `hero.sectionTitle`, `hero.sectionBody`
- `OrderForm.tsx`: `order.badge`, `order.productName`, `order.productSubtitle`, `order.limitedTime`, `order.priceWas`, `order.priceNow`, `order.priceSubLine`, `order.description`, `order.ctaTagline`, `order.ctaLabel`, `order.secureText`, `order.guaranteeText`, `order.ratingText`, each `order.miniTestimonials.${i}.{name,role,quote}`
- `LogoStrip.tsx`: `authority.title`, each `authority.logos.${i}`
- `OnlySystem.tsx`: `onlySystem.{eyebrow,h2,body,ctaTagline,ctaLabel,ctaSubLink,guaranteeText}`, each `onlySystem.{leftFeatures,rightFeatures}.${i}.{title,body}`, each `onlySystem.stats.${i}.{value,label}`
- `Demo.tsx`: `demo.h2`
- `Testimonials.tsx`: `testimonials.{rating,h2,pullQuote}`, each `testimonials.items.${i}.{name,role,quote}`
- `Stack.tsx`: `stack.{h2,ctaTagline,ctaLabel,guaranteeText}`, each `stack.items.${i}.{title,sub,body,access,priceWas,priceNow}`
- `GuaranteeSection.tsx`: `guarantee.h2`, `guarantee.body` (multiline)
- `FAQ.tsx`: `faq.{h2,sub}`, each `faq.items.${i}.{q,a}` (a multiline)
- `Footer.tsx`: `footer.{disclaimer,ctaTagline,ctaLabel,earnings,logoText,copyright}`

For each file, add `import { Edit } from "../_editor/Edit";` and `"use client";` if not already present. Pattern example:

Replace `<span className="ac-headline__eyebrow">{c.eyebrow}</span>` with:
```tsx
<Edit edit={edit} path="headline.eyebrow" as="span" className="ac-headline__eyebrow">{c.eyebrow}</Edit>
```

For Hero specifically, since it composes OrderForm, pass `edit` down: `<OrderForm content={order} edit={edit} />`. Same for Footer (no nested children, just add the prop).

- [ ] **Step 2: Build LandingTree**

Create `app/_editor/LandingTree.tsx`:
```tsx
"use client";
import { useEditor } from "./EditorProvider";
import { Header } from "../_sections/Header";
import { Headline } from "../_sections/Headline";
import { Hero } from "../_sections/Hero";
import { LogoStrip } from "../_sections/LogoStrip";
import { OnlySystem } from "../_sections/OnlySystem";
import { Demo } from "../_sections/Demo";
import { Testimonials } from "../_sections/Testimonials";
import { Stack } from "../_sections/Stack";
import { GuaranteeSection } from "../_sections/GuaranteeSection";
import { FAQ } from "../_sections/FAQ";
import { Footer } from "../_sections/Footer";
import { PublishBar } from "./PublishBar";

export function LandingTree() {
  const { state } = useEditor();
  const c = state.draft;
  return (
    <>
      <PublishBar />
      <Header content={c.header} edit />
      <main id="main">
        <Headline content={c.headline} edit />
        <Hero hero={c.hero} order={c.order} edit />
        <LogoStrip content={c.authority} edit />
        <OnlySystem content={c.onlySystem} edit />
        <Demo content={c.demo} edit />
        <Testimonials content={c.testimonials} edit />
        <Stack content={c.stack} edit />
        <GuaranteeSection content={c.guarantee} edit />
        <FAQ content={c.faq} edit />
      </main>
      <Footer content={c.footer} header={c.header} edit />
    </>
  );
}
```

- [ ] **Step 3: Modify app/page.tsx to switch between trees based on edit mode**

Modify `app/page.tsx` — add imports and conditional rendering:
```tsx
import { headers } from "next/headers";
import { EditorProvider } from "./_editor/EditorProvider";
import { LandingTree } from "./_editor/LandingTree";

export default async function Home() {
  const h = await headers();
  const editMode = h.get("x-adv-edit-mode") === "1";
  const c = ContentSchema.parse(contentJson);

  const productJsonLd = { /* unchanged */ };
  const faqJsonLd = { /* unchanged */ };

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

  // Otherwise: existing static rendering
  return (
    <>
      <JsonLd data={productJsonLd} />
      <JsonLd data={faqJsonLd} />
      {/* sections as before */}
    </>
  );
}
```

- [ ] **Step 4: Manual smoke test**

```bash
npm run dev
```
- `/` not logged in → standard rendering, no outlines
- Login → visit `/` → outlines appear on hover, click on a text → inline edit
- Reload → modif persisted (localStorage)

- [ ] **Step 5: Commit**

```bash
git add app/_sections app/_editor/LandingTree.tsx app/page.tsx
git commit -m "feat(editor): wrap section texts with Edit in edit mode + LandingTree"
```

---

## Phase 4: Media uploads + publish

### Task 20: Signed URL upload route + UploadModal + MediaSwapButton

**Files:**
- Create: `app/api/upload/sign/route.ts`, `app/_editor/UploadModal.tsx`, `app/_editor/MediaSwapButton.tsx`

- [ ] **Step 1: Implement upload/sign route**

Create `app/api/upload/sign/route.ts`:
```typescript
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, SESSION_CONFIG } from "@/lib/auth";

const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif", "video/mp4", "video/webm"];

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const c = await cookies();
        const token = c.get(SESSION_CONFIG.cookieName)?.value;
        const session = token ? await verifySession(token) : null;
        if (!session) throw new Error("Unauthorized");
        return {
          allowedContentTypes: ALLOWED,
          addRandomSuffix: true,
          maximumSizeInBytes: 100 * 1024 * 1024,
          tokenPayload: JSON.stringify({ sub: session.sub, pathname }),
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log("[upload] completed", blob.pathname);
      },
    });
    return NextResponse.json(json);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 401 });
  }
}
```

- [ ] **Step 2: Build UploadModal**

Create `app/_editor/UploadModal.tsx`:
```tsx
"use client";
import { useState } from "react";
import { upload } from "@vercel/blob/client";

export function UploadModal({
  accept,
  allowUrl,
  initialUrl,
  onClose,
  onSelect,
}: {
  accept: "image" | "video";
  allowUrl?: boolean;
  initialUrl?: string;
  onClose: () => void;
  onSelect: (url: string) => void;
}) {
  const [tab, setTab] = useState<"file" | "url">("file");
  const [urlInput, setUrlInput] = useState(initialUrl || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true); setError(null);
    try {
      const blob = await upload(`media/${Date.now()}-${f.name}`, f, {
        access: "public",
        handleUploadUrl: "/api/upload/sign",
        contentType: f.type,
      });
      onSelect(blob.url);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function onUrl() {
    if (!urlInput.trim()) return;
    onSelect(urlInput.trim());
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "grid", placeItems: "center", zIndex: 200 }} onClick={onClose}>
      <div style={{ position: "relative", background: "#fff", borderRadius: 12, padding: 24, width: "min(90vw, 480px)" }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Changer le média</h3>
        {allowUrl && (
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button onClick={() => setTab("file")} style={{ flex: 1, padding: 8, background: tab === "file" ? "#1c7bfd" : "#eee", color: tab === "file" ? "#fff" : "#333", border: 0, borderRadius: 6 }}>Fichier</button>
            <button onClick={() => setTab("url")} style={{ flex: 1, padding: 8, background: tab === "url" ? "#1c7bfd" : "#eee", color: tab === "url" ? "#fff" : "#333", border: 0, borderRadius: 6 }}>URL (YouTube, Vimeo...)</button>
          </div>
        )}
        {tab === "file" ? (
          <input type="file" accept={accept === "image" ? "image/*" : "video/mp4,video/webm"} onChange={onFile} disabled={busy} />
        ) : (
          <div>
            <input type="url" placeholder="https://youtube.com/watch?v=..." value={urlInput} onChange={(e) => setUrlInput(e.target.value)} style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 6 }} />
            <button onClick={onUrl} style={{ marginTop: 8, padding: "8px 16px", background: "#1c7bfd", color: "#fff", border: 0, borderRadius: 6 }}>Utiliser cette URL</button>
          </div>
        )}
        {busy && <p style={{ fontSize: 13, color: "#666", marginTop: 12 }}>Upload en cours...</p>}
        {error && <p style={{ color: "#c62828", fontSize: 13, marginTop: 12 }}>{error}</p>}
        <button onClick={onClose} style={{ position: "absolute", top: 12, right: 12, background: "transparent", border: 0, fontSize: 20, cursor: "pointer" }}>×</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Build MediaSwapButton**

Create `app/_editor/MediaSwapButton.tsx`:
```tsx
"use client";
import { useState } from "react";
import { UploadModal } from "./UploadModal";
import { useEditor } from "./EditorProvider";

export function MediaSwapButton({
  path,
  accept,
  allowUrl,
}: {
  path: string;
  accept: "image" | "video";
  allowUrl?: boolean;
}) {
  const { setField, state } = useEditor();
  const [open, setOpen] = useState(false);
  const current = path.split(".").reduce<any>(
    (acc, k) => acc?.[k.match(/^\d+$/) ? Number(k) : k],
    state.draft,
  ) ?? "";
  const currentUrl = typeof current === "string" ? current : current?.url;

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        style={{
          position: "absolute", top: 8, right: 8, zIndex: 10,
          background: "rgba(15,23,42,.85)", color: "#fff",
          border: 0, borderRadius: 999, padding: "6px 10px",
          fontSize: 12, cursor: "pointer",
        }}
        aria-label="Changer le média"
      >
        ↻ Changer
      </button>
      {open && (
        <UploadModal
          accept={accept}
          allowUrl={allowUrl}
          initialUrl={currentUrl}
          onClose={() => setOpen(false)}
          onSelect={(url) => {
            if (typeof current === "object" && current !== null) setField(path, { ...current, url });
            else setField(path, url);
          }}
        />
      )}
    </>
  );
}
```

- [ ] **Step 4: Add MediaSwapButton to sections with media**

For each section that renders a media in edit mode, wrap the container with `style={{ position: "relative" }}` and add `{edit && <MediaSwapButton path="..." accept="..." allowUrl={...} />}`. Paths to wire:
- `Header.tsx`: wrap the logo `<a>` element. `path="header.logoDark"`, `accept="image"`
- `Hero.tsx`: wrap `.ac-hero__video` div. `path="hero.videoUrl"`, `accept="video"`, `allowUrl={true}`. Also wrap `.ac-hero__video` for poster: `path="hero.videoPoster"`, `accept="image"`
- `OrderForm.tsx`: each mini testimonial avatar div. `path={\`order.miniTestimonials.${i}.avatar\`}`, `accept="image"`
- `Demo.tsx`: wrap `.ac-demo__video`. `path="demo.videoUrl"`, `accept="video"`, `allowUrl={true}`
- `Testimonials.tsx`: each item's media. For type=video: `videoUrl`. For type=text: `avatar`
- `Stack.tsx`: hero image. `path="stack.bigStackImg"`, `accept="image"`

Note: when the path's current value is a `MediaRef` object, `MediaSwapButton` writes `{...current, url}` to preserve other fields. When it's a bare string (e.g. `videoUrl`), it overwrites the string.

- [ ] **Step 5: Manual smoke test**

Set `BLOB_READ_WRITE_TOKEN` in `.env.local` (create a Vercel Blob store at https://vercel.com/dashboard/stores and copy the token):
```bash
npm run dev
```
In edit mode, hover a video → [↻ Changer] visible → click → modal opens → upload a small image → URL injected.

- [ ] **Step 6: Commit**

```bash
git add app/api/upload app/_editor/UploadModal.tsx app/_editor/MediaSwapButton.tsx app/_sections
git commit -m "feat(media): client upload via signed URL + media swap button in editor"
```

---

### Task 21: GitHub library + publish API route

**Files:**
- Create: `lib/github.ts`, `app/api/publish/route.ts`, `tests/lib/github.test.ts`

- [ ] **Step 1: Write failing tests for github.ts**

Create `tests/lib/github.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@octokit/rest", () => ({
  Octokit: vi.fn().mockImplementation(() => ({
    rest: {
      repos: {
        getContent: vi.fn().mockResolvedValue({ data: { type: "file", sha: "abc123", content: Buffer.from('{"x":1}').toString("base64") } }),
        createOrUpdateFileContents: vi.fn().mockResolvedValue({ data: { commit: { sha: "newsha" } } }),
        listCommits: vi.fn().mockResolvedValue({ data: [{ sha: "newsha", commit: { message: "test", author: { date: "2026-05-12T00:00:00Z" } } }] }),
      },
    },
  })),
}));

beforeEach(() => {
  process.env.GITHUB_TOKEN = "fake";
  process.env.GITHUB_REPO = "owner/repo";
  process.env.GITHUB_BRANCH = "main";
});

describe("github lib", () => {
  it("getFile returns content + sha", async () => {
    const { getFile } = await import("@/lib/github");
    const r = await getFile("content/content.json");
    expect(r.sha).toBe("abc123");
    expect(r.content).toEqual({ x: 1 });
  });

  it("putFile commits and returns new sha", async () => {
    const { putFile } = await import("@/lib/github");
    const r = await putFile({ path: "content/content.json", content: { x: 2 }, sha: "abc123", message: "test" });
    expect(r.commitSha).toBe("newsha");
  });

  it("listRecentCommits returns array", async () => {
    const { listRecentCommits } = await import("@/lib/github");
    const r = await listRecentCommits("content/content.json");
    expect(r).toHaveLength(1);
    expect(r[0].sha).toBe("newsha");
  });
});
```

Run: `npm test`. Expected: FAIL.

- [ ] **Step 2: Implement lib/github.ts**

Create `lib/github.ts`:
```typescript
import { Octokit } from "@octokit/rest";

function getClient() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN not set");
  return new Octokit({ auth: token });
}
function repoSlug(): { owner: string; repo: string } {
  const slug = process.env.GITHUB_REPO;
  if (!slug || !slug.includes("/")) throw new Error("GITHUB_REPO must be 'owner/repo'");
  const [owner, repo] = slug.split("/");
  return { owner, repo };
}
function branch(): string { return process.env.GITHUB_BRANCH || "main"; }

export async function getFile(path: string): Promise<{ sha: string; content: unknown }> {
  const o = getClient();
  const { owner, repo } = repoSlug();
  const res = await o.rest.repos.getContent({ owner, repo, path, ref: branch() });
  if (Array.isArray(res.data) || res.data.type !== "file") throw new Error("Not a file");
  const text = Buffer.from(res.data.content, "base64").toString("utf-8");
  return { sha: res.data.sha, content: JSON.parse(text) };
}

export async function putFile(args: { path: string; content: unknown; sha?: string; message: string }): Promise<{ commitSha: string }> {
  const o = getClient();
  const { owner, repo } = repoSlug();
  const res = await o.rest.repos.createOrUpdateFileContents({
    owner, repo, path: args.path, branch: branch(),
    message: args.message, sha: args.sha,
    content: Buffer.from(JSON.stringify(args.content, null, 2)).toString("base64"),
  });
  return { commitSha: res.data.commit.sha! };
}

export async function listRecentCommits(path: string, perPage = 30): Promise<{ sha: string; message: string; date: string }[]> {
  const o = getClient();
  const { owner, repo } = repoSlug();
  const res = await o.rest.repos.listCommits({ owner, repo, path, per_page: perPage, sha: branch() });
  return res.data.map((c) => ({
    sha: c.sha,
    message: c.commit.message,
    date: c.commit.author?.date || c.commit.committer?.date || "",
  }));
}
```

- [ ] **Step 3: Run tests**

```bash
npm test -- tests/lib/github.test.ts
```
Expected: PASS.

- [ ] **Step 4: Implement /api/publish/route.ts**

Create `app/api/publish/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, SESSION_CONFIG } from "@/lib/auth";
import { ContentSchema } from "@/types/content";
import { loadDraft, deleteDraft } from "@/lib/blob";
import { getFile, putFile } from "@/lib/github";

export async function POST() {
  const c = await cookies();
  const token = c.get(SESSION_CONFIG.cookieName)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const draft = await loadDraft();
  if (!draft) return NextResponse.json({ error: "Aucun brouillon à publier" }, { status: 400 });

  const parsed = ContentSchema.safeParse(draft);
  if (!parsed.success) {
    return NextResponse.json({ error: "Contenu invalide", issues: parsed.error.issues }, { status: 400 });
  }

  let current;
  try {
    current = await getFile("content/content.json");
  } catch (e) {
    return NextResponse.json({ error: "Impossible de lire content.json depuis GitHub", detail: (e as Error).message }, { status: 502 });
  }

  if (JSON.stringify(current.content) === JSON.stringify(parsed.data)) {
    await deleteDraft();
    return NextResponse.json({ ok: true, noop: true });
  }

  try {
    const r = await putFile({
      path: "content/content.json",
      content: parsed.data,
      sha: current.sha,
      message: `content: ${session.sub} edit (${new Date().toISOString().slice(0,10)})`,
    });
    await deleteDraft();
    return NextResponse.json({ ok: true, commit_sha: r.commitSha });
  } catch (e) {
    return NextResponse.json({ error: "Échec du commit GitHub", detail: (e as Error).message }, { status: 502 });
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add lib/github.ts app/api/publish tests/lib/github.test.ts
git commit -m "feat(publish): GitHub client + /api/publish route with optimistic locking"
```

---

### Task 22: Deploy status route

**Files:**
- Create: `app/api/deploy-status/route.ts`

- [ ] **Step 1: Implement /api/deploy-status**

Create `app/api/deploy-status/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, SESSION_CONFIG } from "@/lib/auth";

export async function GET(req: Request) {
  const c = await cookies();
  const token = c.get(SESSION_CONFIG.cookieName)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const sha = url.searchParams.get("sha");
  if (!sha) return NextResponse.json({ error: "sha required" }, { status: 400 });

  const projectId = process.env.VERCEL_PROJECT_ID;
  const apiToken = process.env.VERCEL_DEPLOY_TOKEN;
  if (!projectId || !apiToken) {
    return NextResponse.json({ state: "UNKNOWN", reason: "Vercel API not configured" });
  }

  const r = await fetch(`https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=5`, {
    headers: { Authorization: `Bearer ${apiToken}` },
    cache: "no-store",
  });
  if (!r.ok) return NextResponse.json({ state: "UNKNOWN" });
  const body = await r.json();
  const match = (body.deployments as any[]).find((d) => d.meta?.githubCommitSha === sha);
  if (!match) return NextResponse.json({ state: "PENDING" });
  return NextResponse.json({ state: match.state, url: match.url });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/deploy-status
git commit -m "feat(publish): deploy status route polling Vercel API"
```

---

## Phase 5: Admin dashboard pages

### Task 23: History page + API route

**Files:**
- Modify: `app/admin/history/page.tsx`
- Create: `app/api/history/route.ts`, `app/admin/history/_components/HistoryList.tsx`

- [ ] **Step 1: API route**

Create `app/api/history/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, SESSION_CONFIG } from "@/lib/auth";
import { listRecentCommits } from "@/lib/github";

export async function GET() {
  const c = await cookies();
  const token = c.get(SESSION_CONFIG.cookieName)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const commits = await listRecentCommits("content/content.json", 30);
    return NextResponse.json({ commits });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
```

- [ ] **Step 2: HistoryList component**

Create `app/admin/history/_components/HistoryList.tsx`:
```tsx
"use client";
import { useEffect, useState } from "react";

type Commit = { sha: string; message: string; date: string };

export function HistoryList() {
  const [commits, setCommits] = useState<Commit[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/history")
      .then((r) => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((b) => setCommits(b.commits))
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <p style={{ color: "#c62828" }}>Erreur: {error}</p>;
  if (!commits) return <p>Chargement...</p>;
  if (!commits.length) return <p>Aucune publication encore.</p>;

  const repoUrl = process.env.NEXT_PUBLIC_GITHUB_REPO ? `https://github.com/${process.env.NEXT_PUBLIC_GITHUB_REPO}` : "";

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr><th align="left">Date</th><th align="left">Message</th><th></th></tr>
      </thead>
      <tbody>
        {commits.map((c) => (
          <tr key={c.sha} style={{ borderBottom: "1px solid #eee" }}>
            <td style={{ padding: 10, color: "#475569" }}>{new Date(c.date).toLocaleString("fr-FR")}</td>
            <td style={{ padding: 10 }}>{c.message.split("\n")[0]}</td>
            <td style={{ padding: 10 }}>
              {repoUrl && <a href={`${repoUrl}/commit/${c.sha}`} target="_blank" rel="noreferrer">↗ GitHub</a>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 3: History page**

Replace `app/admin/history/page.tsx`:
```tsx
import { HistoryList } from "./_components/HistoryList";

export default function HistoryPage() {
  return (
    <div>
      <h1>Historique des publications</h1>
      <p style={{ color: "#475569" }}>Les 30 dernières modifications de la landing page.</p>
      <HistoryList />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/history app/admin/history
git commit -m "feat(admin): history page listing recent content.json commits"
```

---

### Task 24: Media gallery + Settings page

**Files:**
- Create: `app/api/media/route.ts`, `app/admin/media/_components/MediaGrid.tsx`
- Modify: `app/admin/media/page.tsx`, `app/admin/settings/page.tsx`

- [ ] **Step 1: API route**

Create `app/api/media/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, SESSION_CONFIG } from "@/lib/auth";
import { listMedia } from "@/lib/blob";
import { del } from "@vercel/blob";

async function requireSession() {
  const c = await cookies();
  const token = c.get(SESSION_CONFIG.cookieName)?.value;
  return token ? await verifySession(token) : null;
}

export async function GET() {
  if (!(await requireSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const items = await listMedia();
  return NextResponse.json({ items });
}

export async function DELETE(req: Request) {
  if (!(await requireSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });
  await del(url);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: MediaGrid**

Create `app/admin/media/_components/MediaGrid.tsx`:
```tsx
"use client";
import { useEffect, useState } from "react";

type Item = { pathname: string; url: string; size: number; uploadedAt: string };

export function MediaGrid() {
  const [items, setItems] = useState<Item[] | null>(null);

  async function load() {
    const r = await fetch("/api/media");
    if (r.ok) setItems((await r.json()).items);
  }
  useEffect(() => { load(); }, []);

  async function remove(url: string) {
    if (!confirm("Supprimer ce média ? Si utilisé sur la landing, l'image sera cassée.")) return;
    await fetch("/api/media", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) });
    load();
  }

  if (!items) return <p>Chargement...</p>;
  if (!items.length) return <p>Aucun média uploadé.</p>;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
      {items.map((it) => {
        const isVideo = /\.(mp4|webm)$/i.test(it.pathname);
        return (
          <div key={it.url} style={{ border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
            <div style={{ width: "100%", height: 120, background: "#f5f5f5", marginBottom: 8, borderRadius: 6, overflow: "hidden" }}>
              {isVideo
                ? <video src={it.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
                : <img src={it.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              }
            </div>
            <div style={{ fontSize: 12, color: "#475569", marginBottom: 4 }}>{(it.size / 1024).toFixed(0)} KB · {new Date(it.uploadedAt).toLocaleDateString("fr-FR")}</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => navigator.clipboard.writeText(it.url)} style={{ flex: 1, padding: 6, background: "#1c7bfd", color: "#fff", border: 0, borderRadius: 4, fontSize: 12 }}>Copier URL</button>
              <button onClick={() => remove(it.url)} style={{ padding: 6, background: "#fee", color: "#b91c1c", border: "1px solid #fbb", borderRadius: 4, fontSize: 12 }}>Suppr.</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Media page**

Replace `app/admin/media/page.tsx`:
```tsx
import { MediaGrid } from "./_components/MediaGrid";

export default function MediaPage() {
  return (
    <div>
      <h1>Médiathèque</h1>
      <p style={{ color: "#475569" }}>Tous les médias uploadés depuis l'éditeur.</p>
      <MediaGrid />
    </div>
  );
}
```

- [ ] **Step 4: Settings page**

Replace `app/admin/settings/page.tsx`:
```tsx
export default function SettingsPage() {
  const repo = process.env.GITHUB_REPO || "(non configuré)";
  const branch = process.env.GITHUB_BRANCH || "main";
  const ghlLead = !!process.env.GHL_LEAD_WEBHOOK_URL;
  const ghlAudit = !!process.env.GHL_AUDIT_WEBHOOK_URL;
  const blob = !!process.env.BLOB_READ_WRITE_TOKEN;
  const kv = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

  function Row({ label, ok, value }: { label: string; ok: boolean; value?: string }) {
    return (
      <tr style={{ borderBottom: "1px solid #eee" }}>
        <td style={{ padding: 10 }}>{label}</td>
        <td style={{ padding: 10, color: ok ? "#15803d" : "#b91c1c" }}>{ok ? "✓ OK" : "✗ manquant"}</td>
        <td style={{ padding: 10, color: "#475569", fontFamily: "monospace", fontSize: 13 }}>{value || ""}</td>
      </tr>
    );
  }

  return (
    <div>
      <h1>Réglages</h1>
      <p style={{ color: "#475569" }}>État de la configuration (lecture seule). Modifie les variables d&apos;environnement dans le dashboard Vercel.</p>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 20 }}>
        <tbody>
          <Row label="Repo GitHub" ok={repo !== "(non configuré)"} value={`${repo} (${branch})`} />
          <Row label="Vercel Blob" ok={blob} />
          <Row label="Upstash KV (rate limit)" ok={kv} />
          <Row label="Webhook GHL Lead" ok={ghlLead} />
          <Row label="Webhook GHL Audit (v1.1)" ok={ghlAudit} />
        </tbody>
      </table>
      <p style={{ marginTop: 24, fontSize: 13, color: "#475569" }}>
        Modifie ces réglages dans le <a href="https://vercel.com/dashboard" target="_blank" rel="noreferrer">dashboard Vercel</a>.
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add app/api/media app/admin/media app/admin/settings
git commit -m "feat(admin): media gallery + settings status page"
```

---

## Phase 6: GHL integration + v1.1 stubs

### Task 25: GHL library + /api/lead

**Files:**
- Create: `lib/ghl.ts`, `app/api/lead/route.ts`, `tests/lib/ghl.test.ts`, `tests/api/lead.test.ts`

- [ ] **Step 1: Write failing tests for ghl lib**

Create `tests/lib/ghl.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  process.env.GHL_LEAD_WEBHOOK_URL = "https://services.leadconnectorhq.com/hooks/test";
});

describe("postLeadToGHL", () => {
  it("POSTs JSON to webhook URL", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 200 }));
    const { postLeadToGHL } = await import("@/lib/ghl");
    await postLeadToGHL({ email: "a@b.com", domain: "b.com" });
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://services.leadconnectorhq.com/hooks/test",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("retries on 5xx", async () => {
    const fetchSpy = vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 502 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    const { postLeadToGHL } = await import("@/lib/ghl");
    await postLeadToGHL({ email: "a@b.com" });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("throws if no webhook URL configured", async () => {
    delete process.env.GHL_LEAD_WEBHOOK_URL;
    vi.resetModules();
    const { postLeadToGHL } = await import("@/lib/ghl");
    await expect(postLeadToGHL({ email: "a@b.com" })).rejects.toThrow();
  });
});
```

Run: `npm test`. Expected: FAIL.

- [ ] **Step 2: Implement lib/ghl.ts**

Create `lib/ghl.ts`:
```typescript
async function postWithRetry(url: string, body: unknown, max = 3): Promise<void> {
  let lastErr: unknown;
  for (let i = 0; i < max; i++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) return;
      if (res.status < 500) throw new Error(`GHL ${res.status}: ${await res.text()}`);
      lastErr = new Error(`GHL ${res.status}`);
    } catch (e) { lastErr = e; }
    if (i < max - 1) await new Promise((r) => setTimeout(r, 1000 * Math.pow(3, i)));
  }
  throw lastErr;
}

export type LeadPayload = {
  email: string;
  first_name?: string;
  phone?: string;
  domain?: string;
  source?: string;
  vertical?: string;
  submitted_at?: string;
  user_agent?: string;
  ip_hash?: string;
};

export async function postLeadToGHL(payload: LeadPayload): Promise<void> {
  const url = process.env.GHL_LEAD_WEBHOOK_URL;
  if (!url) throw new Error("GHL_LEAD_WEBHOOK_URL not set");
  await postWithRetry(url, { source: "advanguard-landing", submitted_at: new Date().toISOString(), ...payload });
}

export type AuditPayload = {
  email: string;
  domain: string;
  audit_score: number;
  audit_strengths: string[];
  audit_weaknesses: string[];
  audit_signals_json: string;
  ai_email_1_subject: string;
  ai_email_1_body: string;
  ai_diagnosis_tags: string[];
  audited_at?: string;
};

export async function postAuditToGHL(payload: AuditPayload): Promise<void> {
  const url = process.env.GHL_AUDIT_WEBHOOK_URL;
  if (!url) throw new Error("GHL_AUDIT_WEBHOOK_URL not set");
  await postWithRetry(url, { audited_at: new Date().toISOString(), ...payload });
}
```

- [ ] **Step 3: Run tests**

```bash
npm test -- tests/lib/ghl.test.ts
```
Expected: PASS.

- [ ] **Step 4: Write test for /api/lead**

Create `tests/api/lead.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  process.env.GHL_LEAD_WEBHOOK_URL = "https://x.test/hook";
});

function mkReq(body: unknown): Request {
  return new Request("http://localhost/api/lead", {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "test/1.0", "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/lead", () => {
  it("forwards valid lead to GHL", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 200 }));
    const { POST } = await import("@/app/api/lead/route");
    const res = await POST(mkReq({ email: "matt@clinicabc.com", phone: "+1234" }));
    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalled();
  });

  it("rejects gmail/yahoo emails", async () => {
    const { POST } = await import("@/app/api/lead/route");
    const res = await POST(mkReq({ email: "matt@gmail.com" }));
    expect(res.status).toBe(400);
  });

  it("rejects missing email", async () => {
    const { POST } = await import("@/app/api/lead/route");
    const res = await POST(mkReq({ phone: "+1234" }));
    expect(res.status).toBe(400);
  });

  it("silently accepts honeypot fill (likely bot)", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 200 }));
    const { POST } = await import("@/app/api/lead/route");
    const res = await POST(mkReq({ email: "matt@clinicabc.com", website: "spam" }));
    expect(res.status).toBe(200);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 5: Implement /api/lead route**

Create `app/api/lead/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { postLeadToGHL } from "@/lib/ghl";
import { checkLimit, clientIp, leadLimiter } from "@/lib/ratelimit";

const BLOCKED_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.fr", "ymail.com",
  "outlook.com", "hotmail.com", "live.com", "msn.com",
  "icloud.com", "me.com", "mac.com",
  "proton.me", "protonmail.com",
  "aol.com", "gmx.com", "mail.com",
]);

const BodySchema = z.object({
  email: z.string().email(),
  first_name: z.string().optional(),
  phone: z.string().optional(),
  vertical: z.string().optional(),
  website: z.string().optional(), // honeypot
});

export async function POST(req: Request) {
  const ip = clientIp(req);
  const limit = await checkLimit(leadLimiter, ip);
  if (!limit.success) return NextResponse.json({ error: "Trop de soumissions" }, { status: 429 });

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Email invalide" }, { status: 400 });

  // Honeypot: silently 200 if filled
  if (parsed.data.website && parsed.data.website.trim().length > 0) {
    return NextResponse.json({ ok: true });
  }

  const domain = parsed.data.email.split("@")[1].toLowerCase();
  if (BLOCKED_DOMAINS.has(domain)) {
    return NextResponse.json({ error: "Veuillez utiliser une adresse professionnelle." }, { status: 400 });
  }

  const ip_hash = crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);
  try {
    await postLeadToGHL({
      email: parsed.data.email,
      first_name: parsed.data.first_name,
      phone: parsed.data.phone,
      vertical: parsed.data.vertical,
      domain,
      user_agent: req.headers.get("user-agent") || "",
      ip_hash,
    });
  } catch (e) {
    console.error("[lead] GHL forward failed", e);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: Run all tests**

```bash
npm test
```
Expected: PASS (all suites).

- [ ] **Step 7: Commit**

```bash
git add lib/ghl.ts app/api/lead tests/lib/ghl.test.ts tests/api/lead.test.ts
git commit -m "feat(ghl): /api/lead forwards to GHL Inbound Webhook with honeypot + email validation"
```

---

### Task 26: Audit v1.1 stubs

**Files:**
- Create: `app/api/audit/route.ts`, `content/prompts.json`, `types/prompts.ts`

- [ ] **Step 1: Create types/prompts.ts**

Create `types/prompts.ts`:
```typescript
import { z } from "zod";

export const PromptsSchema = z.object({
  version: z.number().default(1),
  system_prompt: z.string(),
  email_1_template: z.string(),
});

export type Prompts = z.infer<typeof PromptsSchema>;
```

- [ ] **Step 2: Create content/prompts.json**

Create `content/prompts.json`:
```json
{
  "version": 1,
  "system_prompt": "Tu es un expert SEO et CRO spécialisé dans les sites de cliniques médicales. Analyse les signaux fournis et génère une recommandation actionnable.",
  "email_1_template": "[À éditer par Nik depuis l'admin une fois l'audit tool en place]"
}
```

- [ ] **Step 3: Create stub /api/audit/route.ts**

Create `app/api/audit/route.ts`:
```typescript
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Audit tool v1.1 — not yet implemented" }, { status: 501 });
}
```

- [ ] **Step 4: Commit**

```bash
git add types/prompts.ts content/prompts.json app/api/audit
git commit -m "chore(audit): v1.1 stubs (prompts.json, /api/audit returns 501)"
```

---

### Task 27: .env.example and README

**Files:**
- Create: `.env.example`, `README.md`

- [ ] **Step 1: Write .env.example**

Create `.env.example`:
```
# Auth — REQUIRED
JWT_SECRET=change-me-to-a-32+-char-random-string
ADMIN_PASSWORD_HASH=$2a$12$...  # bcrypt hash of Nik's password
# Generate with: node -e "require('bcryptjs').hash('YOUR_PW', 12).then(console.log)"

# GitHub — REQUIRED for /api/publish
GITHUB_TOKEN=ghp_...
GITHUB_REPO=owner/repo
GITHUB_BRANCH=main
NEXT_PUBLIC_GITHUB_REPO=owner/repo

# Vercel Blob — REQUIRED for media + drafts
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...

# Vercel KV / Upstash — REQUIRED for rate limiting in prod
KV_REST_API_URL=https://....upstash.io
KV_REST_API_TOKEN=...

# Vercel deployments API — OPTIONAL (for deploy status polling in admin)
VERCEL_PROJECT_ID=prj_...
VERCEL_DEPLOY_TOKEN=...

# GoHighLevel — REQUIRED for /api/lead
GHL_LEAD_WEBHOOK_URL=https://services.leadconnectorhq.com/hooks/...

# GoHighLevel v1.1 — OPTIONAL
GHL_AUDIT_WEBHOOK_URL=
```

- [ ] **Step 2: Write README.md**

Create `README.md`:
```markdown
# Advanguard — Landing & Admin

Custom landing page + in-context admin for Nik (Advanguard CEO).

## Stack
- Next.js 15 (App Router) + TypeScript
- Vercel hosting (Hobby tier OK)
- Vercel Blob (media + drafts)
- Vercel KV / Upstash (rate limiting)
- GitHub as CMS backend (commits = content)
- GoHighLevel for CRM

## Local setup
1. `cp .env.example .env.local` and fill values
2. Generate password hash: `node -e "require('bcryptjs').hash('your-password', 12).then(console.log)"`
3. `npm install`
4. `npm run dev`
5. Visit http://localhost:3000

## Nik's editing workflow
1. Go to `/admin/login`, log in
2. Visit `/` — edit mode is now active (blue outlines on hover)
3. Click any text to edit; click [↻ Changer] on media to upload
4. Click **Publier** in the top bar → commits to GitHub → Vercel rebuilds in 30-60s

## Architecture
- `app/page.tsx` reads `content/content.json` at build (SSG)
- Edit mode loads draft from Vercel Blob, autosaves every 5s
- "Publish" commits content.json via GitHub API → webhook triggers Vercel rebuild
- Leads from the order form POST to `/api/lead` → forwarded to GHL Inbound Webhook

See `docs/superpowers/specs/2026-05-12-advanguard-landing-admin-design.md` for full design.

## Testing
```
npm test
```
```

- [ ] **Step 3: Commit**

```bash
git add .env.example README.md
git commit -m "docs: .env.example + README"
```

---

### Task 28: Final verification

**Files:**
- (verification only)

- [ ] **Step 1: Typecheck**

```bash
npx tsc --noEmit
```
Expected: no errors. If errors, fix inline.

- [ ] **Step 2: Run full test suite**

```bash
npm test
```
Expected: all tests pass (auth, content, github, ghl, login, lead).

- [ ] **Step 3: Production build**

```bash
npm run build
```
Expected: no errors, `/` reported as SSG, no warnings about missing data.

- [ ] **Step 4: Smoke test prod build locally**

```bash
npm start
```
- Open http://localhost:3000 in one tab
- Open `Advanguard Design System/ui_kits/landing/index.html` via `python3 -m http.server 8080 --directory "Advanguard Design System/ui_kits/landing"` in another
- Compare DOM (DevTools) and visual rendering at 1440px and 375px
- Lighthouse on `/`: expect Perf ≥ 95, SEO 100, A11y ≥ 95

- [ ] **Step 5: Manual admin smoke test**

1. `/admin/login` → log in
2. `/admin` → click "Éditer la landing" → opens `/` with PublishBar
3. Click on a headline text → inline edit → blur → bar shows "1 modif"
4. Click on a video → [↻ Changer] → upload modal → upload image → URL set
5. Click Publier → wait for "Build en cours..." → eventually "✓ Site en ligne"
6. Reload `/` (in private window, logged out) → change visible
7. `/admin/history` → new commit listed
8. `/admin/media` → uploaded image visible
9. `/admin/settings` → all rows green
10. Submit OrderForm with `test@somecompany.com` → check console/GHL for forwarded payload

- [ ] **Step 6: Commit any fixes**

If any failures in steps 1-5, fix and commit. Then:
```bash
git add -A
git commit -m "chore: v1 verification — tests pass, build clean, manual smoke OK"
```

---

### Task 29: Deploy to Vercel

**Files:**
- (deployment only)

- [ ] **Step 1: Create GitHub repo and push**

```bash
gh repo create advanguard --private --source=. --remote=origin --push
```
Alternative: create the repo manually on github.com, then `git remote add origin git@github.com:OWNER/REPO.git && git push -u origin main`.

- [ ] **Step 2: Link Vercel project**

```bash
npx vercel link
```
Choose: create new. Project name: `advanguard`.

- [ ] **Step 3: Configure storage on Vercel dashboard**

In the Vercel dashboard for the project:
- Storage → Create Blob store. `BLOB_READ_WRITE_TOKEN` is auto-injected.
- Storage → Create KV store. `KV_REST_API_URL` and `KV_REST_API_TOKEN` auto-injected.

- [ ] **Step 4: Add env vars**

```bash
npx vercel env add JWT_SECRET production
npx vercel env add ADMIN_PASSWORD_HASH production
npx vercel env add GITHUB_TOKEN production
npx vercel env add GITHUB_REPO production
npx vercel env add GITHUB_BRANCH production
npx vercel env add NEXT_PUBLIC_GITHUB_REPO production
npx vercel env add GHL_LEAD_WEBHOOK_URL production
npx vercel env add VERCEL_PROJECT_ID production
npx vercel env add VERCEL_DEPLOY_TOKEN production
```
Repeat for preview environment if needed.

- [ ] **Step 5: Trigger production deploy**

```bash
npx vercel --prod
```
Watch output for the production URL. Open it.

- [ ] **Step 6: Production smoke test**

Repeat Task 28 Step 5 checks against the production URL.

- [ ] **Step 7: Custom domain**

In Vercel dashboard → Domains → Add Nik's domain. Follow DNS instructions.

- [ ] **Step 8: Tag release**

```bash
git tag -a v1.0.0 -m "v1 landing + admin shipped"
git push --tags
```

---

## Self-review checklist

After implementation:

- [ ] All tasks 1-29 completed
- [ ] `npm test` passes
- [ ] `npm run build` succeeds with `/` as SSG
- [ ] Visual diff vs `Advanguard Design System/ui_kits/landing/index.html` pixel-perfect
- [ ] Lighthouse on `/`: Perf ≥ 95, SEO 100, A11y ≥ 95
- [ ] Login + logout works
- [ ] Edit text → Publish → reload (logged out) → change visible
- [ ] Upload image → Publish → change visible
- [ ] `/admin/history` lists commits
- [ ] `/admin/media` shows uploaded blobs
- [ ] `/admin/settings` shows configs OK
- [ ] OrderForm POST arrives in GHL workflow
- [ ] No `dangerouslySetInnerHTML` outside of `JsonLd.tsx` (which uses `<` escape)

## Out of scope for v1

- AI Audit Tool full implementation (only stubs)
- Drag-and-drop reorder in RepeatableList
- WYSIWYG rich text
- Multilingual content
- Multi-admin users
- Analytics dashboard
- A/B testing
