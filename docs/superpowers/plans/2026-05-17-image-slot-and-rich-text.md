# Image slot + badge fix + rich text — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional product image inside the order box, verify (and fix if broken) badge editability, then add inline rich-text formatting (bold/italic/underline/color) for 23 curated landing fields.

**Architecture:** Three sequenced sub-features sharing one branch. A and B are surgical (schema + JSX + CSS). C introduces a new `lib/richtext/` module (palette, sanitizer, selection helpers) and a new `EditableRichText`/`EditRich` editor pair with a floating toolbar. Rich-text fields stay typed as `z.string()`; the meaning of the string just becomes "sanitized HTML". Publish-time sanitization is the security boundary.

**Tech Stack:** Next.js 16 App Router, React 19, Zod 4, vitest 4 (happy-dom env for DOM tests), TypeScript 5. No new dependencies.

**Spec:** [docs/superpowers/specs/2026-05-17-image-slot-and-rich-text-design.md](../specs/2026-05-17-image-slot-and-rich-text-design.md)

---

## Task 1 — Image slot in the order box (Feature A)

**Files:**
- Modify: `types/content.ts` (extend `OrderSchema`)
- Modify: `app/_sections/OrderForm.tsx` (insert image block between badge strip and product name)
- Modify: `styles/landing.css` (add `.ac-order__image*` rules)

- [ ] **Step 1: Extend `OrderSchema` with an optional `image` field**

Open `types/content.ts`. Find the `OrderSchema` declaration (around line 60):

```ts
export const OrderSchema = z.object({
  badge: z.string(),
  productName: z.string(),
  productSubtitle: z.string(),
  limitedTime: z.string(),
  // ... rest
});
```

Add `image: MediaRefSchema.optional(),` as the first field after `productSubtitle`:

```ts
export const OrderSchema = z.object({
  badge: z.string(),
  productName: z.string(),
  productSubtitle: z.string(),
  image: MediaRefSchema.optional(),
  limitedTime: z.string(),
  // ... rest unchanged
});
```

`MediaRefSchema` is already declared in the same file. No new imports needed.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean. The optional field doesn't break any existing data.

- [ ] **Step 3: Insert the image block in `OrderForm.tsx`**

Open `app/_sections/OrderForm.tsx`. Locate this block (around lines 28-32):

```tsx
<aside className="ac-order" aria-label="Order form">
  <div className="ac-order__strip">
    <Edit edit={edit} path="order.badge">{order.badge}</Edit>
  </div>
  <div className="ac-order__product">
```

Insert the new image block BETWEEN the closing tag of `ac-order__strip` and the opening tag of `ac-order__product`:

```tsx
<aside className="ac-order" aria-label="Order form">
  <div className="ac-order__strip">
    <Edit edit={edit} path="order.badge">{order.badge}</Edit>
  </div>
  {(mediaUrl(order.image) || edit) && (
    <div className="ac-order__image" style={{ position: "relative" }}>
      {mediaUrl(order.image) && (
        <img
          src={mediaUrl(order.image)}
          alt={typeof order.image === "object" && order.image ? (order.image.alt ?? "") : ""}
          className="ac-order__image-img"
        />
      )}
      {edit && <MediaSlot path="order.image" accept="image" compact />}
    </div>
  )}
  <div className="ac-order__product">
```

You also need to import `MediaSlot` at the top of the file if it's not already there. Check existing imports; if absent, add:

```tsx
import { MediaSlot } from "../_editor/MediaSlot";
```

The `mediaUrl` helper is already imported (line 7: `import { mediaUrl, type OrderContent } from "@/types/content";`).

- [ ] **Step 4: Add the CSS**

Open `styles/landing.css`. Find the existing `.ac-order__strip` rule (search for `ac-order__strip {`). Insert these new rules immediately AFTER `.ac-order__strip` and BEFORE `.ac-order__product`:

```css
.ac-order__image {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 12px 0 8px;
  min-height: 60px;
}
.ac-order__image-img {
  max-width: 100%;
  max-height: 180px;
  height: auto;
  object-fit: contain;
  border-radius: 8px;
}
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add types/content.ts app/_sections/OrderForm.tsx styles/landing.css
git commit -m "feat(landing): add optional image slot in order box"
```

---

## Task 2 — Badge editability check (Feature B)

This is an investigative task, not a TDD task. Outcomes branch: (a) bug doesn't exist -> no-op commit message documenting confirmation, OR (b) bug exists -> fix the CSS.

**Files:**
- Possibly modify: `styles/landing.css` (only if a click-blocking CSS rule is found)

- [ ] **Step 1: Start dev server and reproduce**

Run: `npm run dev`

Open the landing page in admin mode. Click directly on the text "NOW AVAILABLE FOR INSTANT DIGITAL DOWNLOAD" inside the blue strip at the top of the order box. Observe:
- Does the caret appear?
- Can you type to replace the text?
- Does the change persist on blur?

If YES to all three -> skip to Step 4. The bug doesn't exist.

If NO -> continue to Step 2.

- [ ] **Step 2: Diagnose with DevTools**

In Chrome DevTools, inspect the `.ac-order__strip` element AND the inner element rendered by `<Edit>` (it'll be a `<span>` by default per `app/_editor/EditableText.tsx` line 9).

Check Computed styles for:
- `pointer-events` (anything other than `auto` blocks clicks)
- `user-select` (anything other than `text` / `auto` blocks selection)
- Any pseudo-element (`::before`, `::after`) that covers the text — check the box-model overlay
- `z-index` of parent or sibling elements — anything covering the strip

Note the specific rule and selector that's blocking.

- [ ] **Step 3: Fix the CSS**

Open `styles/landing.css`. Apply the minimal fix based on what you found in Step 2.

Examples of valid fixes (pick the one that matches the actual cause — do NOT apply blindly):

If `.ac-order__strip` had `user-select: none`:
```css
.ac-order__strip {
  /* existing rules */
  user-select: text;
}
```

If a `::before` overlay intercepted clicks:
```css
.ac-order__strip::before {
  /* existing rules */
  pointer-events: none;
}
```

Re-run the dev server and re-verify the click works.

- [ ] **Step 4: Commit (one of two messages depending on outcome)**

If you confirmed the bug doesn't exist (no code change):
```bash
git commit --allow-empty -m "chore(landing): verify order badge is editable in admin mode (no bug)"
```

If you fixed a CSS issue:
```bash
git add styles/landing.css
git commit -m "fix(landing): unblock click target on order.badge in admin mode"
```

---

## Task 3 — Palette module (Feature C.1)

**Files:**
- Create: `lib/richtext/palette.ts`

- [ ] **Step 1: Create the palette file**

```ts
// lib/richtext/palette.ts

/**
 * Curated 12-color palette used by the rich-text formatter.
 * Hex values mirror tokens in styles/colors_and_type.css so colored
 * text remains visually consistent with the rest of the site.
 */
export const RICHTEXT_PALETTE = [
  { label: "Black", hex: "#140c0c" },
  { label: "Dark navy", hex: "#061130" },
  { label: "Navy", hex: "#233567" },
  { label: "Gray", hex: "#394976" },
  { label: "Light gray", hex: "#6d6d6d" },
  { label: "White", hex: "#ffffff" },
  { label: "Brand blue", hex: "#1c7fff" },
  { label: "Deep blue", hex: "#1945e0" },
  { label: "Success green", hex: "#38d25a" },
  { label: "Danger red", hex: "#ff0000" },
  { label: "Coral red", hex: "#ec274a" },
  { label: "Warning yellow", hex: "#ffce1e" },
] as const;

export type PaletteColor = (typeof RICHTEXT_PALETTE)[number];

/** Lowercase hex strings accepted in stored HTML `color:` style values. */
export const PALETTE_HEX_SET = new Set(RICHTEXT_PALETTE.map((c) => c.hex.toLowerCase()));
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add lib/richtext/palette.ts
git commit -m "feat(richtext): add 12-color brand palette source of truth"
```

---

## Task 4 — Sanitizer + tests (Feature C.2, TDD)

**Files:**
- Create: `tests/lib/richtext/sanitize.test.ts`
- Create: `lib/richtext/sanitize.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/richtext/sanitize.test.ts`:

```ts
// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { sanitizeRichText } from "@/lib/richtext/sanitize";

describe("sanitizeRichText", () => {
  it("passes plain text through unchanged", () => {
    expect(sanitizeRichText("Hello world")).toBe("Hello world");
  });

  it("preserves allowed tags: strong, em, u, br", () => {
    expect(sanitizeRichText("<strong>bold</strong> <em>italic</em> <u>under</u><br>next")).toBe(
      "<strong>bold</strong> <em>italic</em> <u>under</u><br>next",
    );
  });

  it("preserves span with allowed color style from the palette", () => {
    expect(sanitizeRichText('<span style="color:#1c7fff">blue</span>')).toBe(
      '<span style="color:#1c7fff">blue</span>',
    );
  });

  it("strips tags outside the allowlist but keeps inner text", () => {
    expect(sanitizeRichText("<script>alert(1)</script>danger")).toBe("danger");
    expect(sanitizeRichText("<div><p>hi</p></div>")).toBe("hi");
    expect(sanitizeRichText('<a href="evil">click</a>')).toBe("click");
  });

  it("strips disallowed attributes on allowed tags", () => {
    expect(sanitizeRichText('<strong onclick="alert(1)">x</strong>')).toBe("<strong>x</strong>");
    expect(sanitizeRichText('<em class="foo" id="bar">y</em>')).toBe("<em>y</em>");
  });

  it("strips span style that is not a palette color", () => {
    expect(sanitizeRichText('<span style="color:#abcdef">x</span>')).toBe("<span>x</span>");
    expect(sanitizeRichText('<span style="font-size:99px">x</span>')).toBe("<span>x</span>");
    expect(sanitizeRichText('<span style="color:#1c7fff;background:red">x</span>')).toBe(
      "<span>x</span>",
    );
  });

  it("handles nested allowed tags correctly", () => {
    expect(sanitizeRichText("<strong><em>bi</em></strong>")).toBe("<strong><em>bi</em></strong>");
  });

  it("preserves text around stripped tags", () => {
    expect(sanitizeRichText("hello <script>evil</script> world")).toBe("hello evil world");
  });

  it("handles empty input", () => {
    expect(sanitizeRichText("")).toBe("");
  });

  it("preserves unicode", () => {
    expect(sanitizeRichText("Café <strong>déjà</strong> vu — ✓")).toBe(
      "Café <strong>déjà</strong> vu — ✓",
    );
  });

  it("normalizes color hex to lowercase before matching", () => {
    expect(sanitizeRichText('<span style="color:#FFCE1E">y</span>')).toBe(
      '<span style="color:#ffce1e">y</span>',
    );
  });
});
```

- [ ] **Step 2: Run tests — confirm all 11 fail**

Run: `npx vitest run tests/lib/richtext/sanitize.test.ts`
Expected: 11 failures, "Cannot find module '@/lib/richtext/sanitize'".

- [ ] **Step 3: Implement the sanitizer**

Create `lib/richtext/sanitize.ts`:

```ts
import { PALETTE_HEX_SET } from "./palette";

const ALLOWED_TAGS = new Set(["strong", "em", "u", "br", "span"]);
const ALLOWED_ATTRS_BY_TAG: Record<string, Set<string>> = {
  span: new Set(["style"]),
};
const COLOR_STYLE_RE = /^color:\s*(#[0-9a-fA-F]{6})\s*;?\s*$/;

function walkSanitize(node: Node, doc: Document): string {
  if (node.nodeType === doc.TEXT_NODE) {
    return (node.textContent ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  if (node.nodeType !== doc.ELEMENT_NODE) return "";

  const el = node as Element;
  const tag = el.tagName.toLowerCase();

  let inner = "";
  el.childNodes.forEach((child) => { inner += walkSanitize(child, doc); });

  if (!ALLOWED_TAGS.has(tag)) {
    return inner;
  }

  if (tag === "br") return "<br>";

  const allowedAttrs = ALLOWED_ATTRS_BY_TAG[tag];
  let attrs = "";
  if (allowedAttrs) {
    for (const { name, value } of Array.from(el.attributes)) {
      if (!allowedAttrs.has(name)) continue;
      if (name === "style") {
        const m = value.match(COLOR_STYLE_RE);
        if (!m) continue;
        const hex = m[1].toLowerCase();
        if (!PALETTE_HEX_SET.has(hex)) continue;
        attrs += ` style="color:${hex}"`;
      } else {
        attrs += ` ${name}="${value.replace(/"/g, "&quot;")}"`;
      }
    }
  }

  return `<${tag}${attrs}>${inner}</${tag}>`;
}

export function sanitizeRichText(input: string): string {
  if (!input) return "";
  const doc = new DOMParser().parseFromString(`<div>${input}</div>`, "text/html");
  const root = doc.body.firstChild;
  if (!root) return "";
  let out = "";
  root.childNodes.forEach((child) => { out += walkSanitize(child, doc); });
  return out;
}
```

- [ ] **Step 4: Run tests — confirm all 11 pass**

Run: `npx vitest run tests/lib/richtext/sanitize.test.ts`
Expected: 11 / 11 passed.

If any fail, the failure message tells you exactly what shape the sanitizer is producing vs. what the test expects — fix the sanitizer, not the test.

- [ ] **Step 5: Commit**

```bash
git add lib/richtext/sanitize.ts tests/lib/richtext/sanitize.test.ts
git commit -m "feat(richtext): sanitize rich-text input to a 4-tag allowlist"
```

---

## Task 5 — Selection helpers + tests (Feature C.3, TDD)

**Files:**
- Create: `tests/lib/richtext/selection.test.ts`
- Create: `lib/richtext/selection.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/richtext/selection.test.ts`:

```ts
// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from "vitest";
import { wrapSelection, unwrapAroundSelection, isSelectionWrappedBy } from "@/lib/richtext/selection";

function setup(html: string, anchorStart: number, focusEnd: number): { host: HTMLElement; range: Range } {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  const range = document.createRange();
  const text = host.firstChild as Text;
  range.setStart(text, anchorStart);
  range.setEnd(text, focusEnd);
  return { host, range };
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("wrapSelection", () => {
  it("wraps a text selection in <strong>", () => {
    const { host, range } = setup("hello world", 0, 5);
    wrapSelection(range, "strong");
    expect(host.innerHTML).toBe("<strong>hello</strong> world");
  });

  it("wraps a text selection in <em>", () => {
    const { host, range } = setup("hello world", 6, 11);
    wrapSelection(range, "em");
    expect(host.innerHTML).toBe("hello <em>world</em>");
  });

  it("wraps with attributes", () => {
    const { host, range } = setup("hello", 0, 5);
    wrapSelection(range, "span", { style: "color:#1c7fff" });
    expect(host.innerHTML).toBe('<span style="color:#1c7fff">hello</span>');
  });
});

describe("unwrapAroundSelection", () => {
  it("removes a <strong> wrapper around the selected range", () => {
    const host = document.createElement("div");
    host.innerHTML = "<strong>hello</strong> world";
    document.body.appendChild(host);
    const range = document.createRange();
    const inside = host.querySelector("strong")!.firstChild as Text;
    range.setStart(inside, 0);
    range.setEnd(inside, 5);
    unwrapAroundSelection(range, "strong");
    expect(host.innerHTML).toBe("hello world");
  });

  it("removes a <span style> wrapper", () => {
    const host = document.createElement("div");
    host.innerHTML = '<span style="color:#1c7fff">hello</span>';
    document.body.appendChild(host);
    const range = document.createRange();
    const inside = host.querySelector("span")!.firstChild as Text;
    range.setStart(inside, 0);
    range.setEnd(inside, 5);
    unwrapAroundSelection(range, "span");
    expect(host.innerHTML).toBe("hello");
  });
});

describe("isSelectionWrappedBy", () => {
  it("returns true when the range sits inside the named tag", () => {
    const host = document.createElement("div");
    host.innerHTML = "<strong>hello</strong>";
    document.body.appendChild(host);
    const range = document.createRange();
    const inside = host.querySelector("strong")!.firstChild as Text;
    range.setStart(inside, 0);
    range.setEnd(inside, 5);
    expect(isSelectionWrappedBy(range, "strong", host)).toBe(true);
  });

  it("returns false when the range is in plain text", () => {
    const { host, range } = setup("hello", 0, 5);
    expect(isSelectionWrappedBy(range, "strong", host)).toBe(false);
  });

  it("returns false when the range crosses past the wrapper boundary", () => {
    const host = document.createElement("div");
    host.innerHTML = "<strong>hello</strong> world";
    document.body.appendChild(host);
    const range = document.createRange();
    const inside = host.querySelector("strong")!.firstChild as Text;
    const after = inside.parentElement!.nextSibling as Text;
    range.setStart(inside, 0);
    range.setEnd(after, 3);
    expect(isSelectionWrappedBy(range, "strong", host)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — confirm all 8 fail**

Run: `npx vitest run tests/lib/richtext/selection.test.ts`
Expected: 8 failures, "Cannot find module '@/lib/richtext/selection'".

- [ ] **Step 3: Implement the selection helpers**

Create `lib/richtext/selection.ts`:

```ts
/**
 * Wraps the contents of `range` in a new element of `tag` with optional
 * attributes. If the range spans element boundaries, falls back to
 * extractContents() + appendChild() so the wrapping always succeeds.
 */
export function wrapSelection(range: Range, tag: string, attrs?: Record<string, string>): void {
  const doc = range.startContainer.ownerDocument ?? document;
  const el = doc.createElement(tag);
  if (attrs) {
    for (const [name, value] of Object.entries(attrs)) {
      el.setAttribute(name, value);
    }
  }
  try {
    range.surroundContents(el);
  } catch {
    el.appendChild(range.extractContents());
    range.insertNode(el);
  }
}

/**
 * If the range sits inside an element of the named `tag` (closest ancestor),
 * unwraps that element — replacing it with its children. Otherwise no-op.
 */
export function unwrapAroundSelection(range: Range, tag: string): void {
  const ancestor = findAncestor(range.commonAncestorContainer, tag);
  if (!ancestor) return;
  const parent = ancestor.parentNode;
  if (!parent) return;
  while (ancestor.firstChild) {
    parent.insertBefore(ancestor.firstChild, ancestor);
  }
  parent.removeChild(ancestor);
}

/**
 * Returns true if the full range is contained within an element of `tag`
 * that itself lives inside `root`. Used to drive toolbar "active" state.
 */
export function isSelectionWrappedBy(range: Range, tag: string, root: Element): boolean {
  const start = findAncestor(range.startContainer, tag);
  const end = findAncestor(range.endContainer, tag);
  if (!start || !end) return false;
  if (start !== end) return false;
  return root.contains(start);
}

function findAncestor(node: Node, tag: string): Element | null {
  let cur: Node | null = node;
  while (cur) {
    if (cur.nodeType === 1 && (cur as Element).tagName.toLowerCase() === tag) {
      return cur as Element;
    }
    cur = cur.parentNode;
  }
  return null;
}
```

- [ ] **Step 4: Run tests — confirm all 8 pass**

Run: `npx vitest run tests/lib/richtext/selection.test.ts`
Expected: 8 / 8 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/richtext/selection.ts tests/lib/richtext/selection.test.ts
git commit -m "feat(richtext): selection-based wrap/unwrap/detect helpers"
```

---

## Task 6 — EditableRichText component (Feature C.4, part 1)

**Files:**
- Create: `app/_editor/EditableRichText.tsx`
- Create: `app/_editor/EditRich.tsx`

NOTE: this task creates a component that depends on `RichTextToolbar` (created in Task 7). Don't commit until Task 7 is also done — they ship as one commit.

- [ ] **Step 1: Create the `EditableRichText` component**

Create `app/_editor/EditableRichText.tsx`:

```tsx
"use client";
import { useEffect, useRef, useState, type ElementType } from "react";
import { useEditor } from "./EditorProvider";
import { useSectionPath } from "./SectionContext";
import { RichTextToolbar } from "./RichTextToolbar";
import styles from "./styles.module.css";

export function EditableRichText({
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
  const fullPath = useSectionPath(path);
  const ref = useRef<HTMLElement | null>(null);
  const [editing, setEditing] = useState(false);
  const [toolbarRange, setToolbarRange] = useState<Range | null>(null);

  const value: string = fullPath.split(".").reduce<any>(
    (acc, k) => acc?.[k.match(/^\d+$/) ? Number(k) : k],
    state.draft,
  ) ?? "";

  useEffect(() => {
    if (!editing || !ref.current) return;
    ref.current.innerHTML = value;
    ref.current.focus();
  }, [editing, value]);

  useEffect(() => {
    if (!editing) { setToolbarRange(null); return; }
    function onSelectionChange() {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) { setToolbarRange(null); return; }
      const r = sel.getRangeAt(0);
      if (!ref.current?.contains(r.commonAncestorContainer)) { setToolbarRange(null); return; }
      setToolbarRange(r);
    }
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, [editing]);

  function onBlur(e: React.FocusEvent) {
    const next = e.relatedTarget as HTMLElement | null;
    if (next?.dataset?.richTextToolbar === "true") return;
    setEditing(false);
    setToolbarRange(null);
    const html = ref.current?.innerHTML ?? "";
    if (html !== value) setField(fullPath, html);
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") (e.currentTarget as HTMLElement).blur();
    if (!multiline && e.key === "Enter") {
      e.preventDefault();
      (e.currentTarget as HTMLElement).blur();
    }
  }

  function onPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  }

  function onMutated() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    setToolbarRange(sel.getRangeAt(0));
  }

  if (state.previewMode) {
    return (
      <Tag
        className={className}
        style={{ whiteSpace: multiline ? "pre-line" : undefined }}
        dangerouslySetInnerHTML={{ __html: value }}
      />
    );
  }

  if (!editing) {
    return (
      <Tag
        className={`${className} ${styles.editable}`}
        tabIndex={0}
        onClick={() => setEditing(true)}
        style={{ whiteSpace: multiline ? "pre-line" : undefined }}
        dangerouslySetInnerHTML={{ __html: value || (typeof children === "string" ? children : "") }}
      />
    );
  }

  return (
    <>
      <Tag
        ref={ref}
        className={`${className} ${styles.editable}`}
        data-editing="true"
        data-multiline={multiline ? "true" : "false"}
        contentEditable
        suppressContentEditableWarning
        tabIndex={0}
        onBlur={onBlur}
        onKeyDown={onKey}
        onPaste={onPaste}
        style={{ whiteSpace: multiline ? "pre-line" : undefined }}
      />
      {toolbarRange && ref.current && (
        <RichTextToolbar range={toolbarRange} host={ref.current} onMutated={onMutated} />
      )}
    </>
  );
}
```

- [ ] **Step 2: Create the `<EditRich>` wrapper**

Create `app/_editor/EditRich.tsx`:

```tsx
"use client";
import type { ElementType, ReactNode } from "react";
import { EditableRichText } from "./EditableRichText";

export function EditRich({
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
  if (!edit) {
    const Tag = (as ?? "span") as ElementType;
    const html = typeof children === "string" ? children : "";
    return (
      <Tag
        className={className}
        style={{ whiteSpace: multiline ? "pre-line" : undefined }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  return (
    <EditableRichText path={path} as={as} className={className} multiline={multiline}>
      {children}
    </EditableRichText>
  );
}
```

- [ ] **Step 3: Typecheck (will show one expected error)**

Run: `npx tsc --noEmit`
Expected: ONE error about `RichTextToolbar` not being defined. All other paths should typecheck. If you see other errors, fix them before proceeding.

Don't commit yet. Continue immediately to Task 7.

---

## Task 7 — RichTextToolbar component (Feature C.4, part 2)

**Files:**
- Create: `app/_editor/RichTextToolbar.tsx`

- [ ] **Step 1: Create the toolbar component**

Create `app/_editor/RichTextToolbar.tsx`:

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { RICHTEXT_PALETTE } from "@/lib/richtext/palette";
import {
  wrapSelection,
  unwrapAroundSelection,
  isSelectionWrappedBy,
} from "@/lib/richtext/selection";

type Props = {
  range: Range;
  host: HTMLElement;
  onMutated: () => void;
};

const btn: React.CSSProperties = {
  background: "transparent",
  border: 0,
  padding: "4px 8px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  color: "#18181b",
  borderRadius: 4,
  fontFamily: "var(--adv-font, system-ui, sans-serif)",
};
const btnActive: React.CSSProperties = {
  ...btn,
  background: "#1c7bfd",
  color: "#fff",
};

export function RichTextToolbar({ range, host, onMutated }: Props) {
  const [view, setView] = useState<"main" | "color">("main");
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;
    const top = window.scrollY + rect.top - 44;
    const left = Math.max(8, window.scrollX + rect.left + rect.width / 2 - 110);
    setPos({ top, left });
  }, [range]);

  function applyToggle(tag: "strong" | "em" | "u") {
    if (isSelectionWrappedBy(range, tag, host)) {
      unwrapAroundSelection(range, tag);
    } else {
      wrapSelection(range, tag);
    }
    onMutated();
  }

  function applyColor(hex: string) {
    if (isSelectionWrappedBy(range, "span", host)) {
      unwrapAroundSelection(range, "span");
    }
    wrapSelection(range, "span", { style: `color:${hex}` });
    setView("main");
    onMutated();
  }

  function clearColor() {
    if (isSelectionWrappedBy(range, "span", host)) {
      unwrapAroundSelection(range, "span");
    }
    setView("main");
    onMutated();
  }

  const activeBold = isSelectionWrappedBy(range, "strong", host);
  const activeItalic = isSelectionWrappedBy(range, "em", host);
  const activeUnder = isSelectionWrappedBy(range, "u", host);

  return (
    <div
      ref={ref}
      data-rich-text-toolbar="true"
      tabIndex={-1}
      onMouseDown={(e) => e.preventDefault()}
      style={{
        position: "absolute",
        top: pos.top,
        left: pos.left,
        zIndex: 200,
        background: "#fff",
        border: "1px solid var(--adv-border, #e7e7ea)",
        borderRadius: 8,
        boxShadow: "0 8px 24px rgba(0,0,0,.16)",
        padding: 4,
        display: "flex",
        flexDirection: view === "color" ? "column" : "row",
        gap: 4,
        fontFamily: "var(--adv-font, system-ui, sans-serif)",
      }}
    >
      {view === "main" && (
        <>
          <button data-rich-text-toolbar="true" type="button" style={activeBold ? btnActive : btn} onClick={() => applyToggle("strong")}>B</button>
          <button data-rich-text-toolbar="true" type="button" style={{ ...(activeItalic ? btnActive : btn), fontStyle: "italic" }} onClick={() => applyToggle("em")}>I</button>
          <button data-rich-text-toolbar="true" type="button" style={{ ...(activeUnder ? btnActive : btn), textDecoration: "underline" }} onClick={() => applyToggle("u")}>U</button>
          <button data-rich-text-toolbar="true" type="button" style={btn} onClick={() => setView("color")}>color</button>
        </>
      )}
      {view === "color" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 24px)", gap: 6, padding: 4 }}>
            {RICHTEXT_PALETTE.map((c) => (
              <button
                key={c.hex}
                data-rich-text-toolbar="true"
                type="button"
                aria-label={c.label}
                onClick={() => applyColor(c.hex)}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: c.hex,
                  border: c.hex === "#ffffff" ? "1px solid #e7e7ea" : "1px solid rgba(0,0,0,0.06)",
                  cursor: "pointer",
                  padding: 0,
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", gap: 4, padding: "0 4px 4px" }}>
            <button data-rich-text-toolbar="true" type="button" style={btn} onClick={clearColor}>x Clear</button>
            <button data-rich-text-toolbar="true" type="button" style={btn} onClick={() => setView("main")}>back</button>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean. The `EditableRichText` from Task 6 now resolves its `RichTextToolbar` import.

- [ ] **Step 3: Commit (Task 6 + Task 7 together)**

```bash
git add app/_editor/EditableRichText.tsx app/_editor/EditRich.tsx app/_editor/RichTextToolbar.tsx
git commit -m "feat(richtext): EditableRichText editor + floating toolbar"
```

---

## Task 8 — Hook sanitizer into the publish endpoint (Feature C.6)

**Files:**
- Create: `lib/richtext/migrated-fields.ts` (list of rich-text field paths)
- Modify: `app/api/publish/route.ts` (call sanitizer before commit)

- [ ] **Step 1: Create the field-list module**

Create `lib/richtext/migrated-fields.ts`:

```ts
/**
 * Dotted paths into the Content tree for fields that store sanitized HTML.
 * Used by the publish endpoint to apply sanitization before committing.
 * Order: alphabetised for readability.
 */
export const RICHTEXT_FIELD_PATHS = [
  "demo.h2",
  "faq.h2",
  "faq.sub",
  "footer.disclaimer",
  "guarantee.body",
  "guarantee.h2",
  "headline.eyebrow",
  "headline.h1",
  "headline.sub",
  "hero.sectionBody",
  "hero.sectionTitle",
  "onlySystem.body",
  "onlySystem.eyebrow",
  "onlySystem.h2",
  "order.badge",
  "order.description",
  "order.guaranteeText",
  "order.productName",
  "order.productSubtitle",
  "stack.guaranteeText",
  "stack.h2",
  "testimonials.h2",
  "testimonials.pullQuote",
] as const;
```

23 entries — matches the spec's "Fields migrated to EditableRichText (v1)" list exactly.

- [ ] **Step 2: Modify the publish route to sanitize before committing**

Open `app/api/publish/route.ts`.

Add these imports at the top with the existing ones:

```ts
import { sanitizeRichText } from "@/lib/richtext/sanitize";
import { RICHTEXT_FIELD_PATHS } from "@/lib/richtext/migrated-fields";
```

Add this helper function above the `POST` export:

```ts
function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, k) => {
    if (acc == null || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[k];
  }, obj);
}

function setByPath(obj: any, path: string, value: unknown): void {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    cur = cur[parts[i]];
    if (cur == null) return;
  }
  cur[parts[parts.length - 1]] = value;
}

function sanitizeMigratedFields(content: any): void {
  for (const p of RICHTEXT_FIELD_PATHS) {
    const v = getByPath(content, p);
    if (typeof v === "string") setByPath(content, p, sanitizeRichText(v));
  }
  if (Array.isArray(content.sections)) {
    for (const s of content.sections) {
      if (s?.type === "hero" && s.data) {
        for (const p of RICHTEXT_FIELD_PATHS) {
          if (!p.startsWith("hero.") && !p.startsWith("order.")) continue;
          const v = getByPath(s.data, p);
          if (typeof v === "string") setByPath(s.data, p, sanitizeRichText(v));
        }
      }
    }
  }
}
```

Then in the `POST` body, call the sanitizer right after the migration succeeds, BEFORE the diff comparison:

Find:
```ts
let migrated;
try {
  migrated = migrateContent(draft);
} catch (e) {
  return NextResponse.json({ error: "Invalid content", detail: (e as Error).message }, { status: 400 });
}
```

And add immediately after the closing `}` of the try/catch:

```ts
sanitizeMigratedFields(migrated);
```

Note: the function mutates `migrated` in place. This is intentional — keeps the diff comparison logic later in the function unchanged.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Run the full test suite**

Run: `npx vitest run`
Expected: all tests pass (sanitizer tests + selection tests + all pre-existing tests = 141 total).

- [ ] **Step 5: Commit**

```bash
git add lib/richtext/migrated-fields.ts app/api/publish/route.ts
git commit -m "feat(publish): sanitize rich-text fields before committing to GitHub"
```

---

## Task 9 — Migrate order box fields to EditRich (Feature C.7)

**Files:**
- Modify: `app/_sections/OrderForm.tsx`
- Modify: `types/content.ts` (add JSDoc on the 5 fields)

- [ ] **Step 1: Add JSDoc on the order rich-text fields**

In `types/content.ts`, find `OrderSchema`. Add a JSDoc comment line above each of these 5 properties: `badge`, `productName`, `productSubtitle`, `description`, `guaranteeText`. Comment text (identical each time):

```ts
/** Rich text (HTML). Allowed tags: strong, em, u, span[style=color]. */
```

Apply to:
```ts
export const OrderSchema = z.object({
  /** Rich text (HTML). Allowed tags: strong, em, u, span[style=color]. */
  badge: z.string(),
  /** Rich text (HTML). Allowed tags: strong, em, u, span[style=color]. */
  productName: z.string(),
  /** Rich text (HTML). Allowed tags: strong, em, u, span[style=color]. */
  productSubtitle: z.string(),
  image: MediaRefSchema.optional(),
  limitedTime: z.string(),
  priceWas: z.string(),
  priceNow: z.string(),
  priceSubLine: z.string(),
  /** Rich text (HTML). Allowed tags: strong, em, u, span[style=color]. */
  description: z.string(),
  ctaTagline: z.string(),
  ctaLabel: z.string(),
  secureText: z.string(),
  /** Rich text (HTML). Allowed tags: strong, em, u, span[style=color]. */
  guaranteeText: z.string(),
  ratingText: z.string(),
  miniTestimonials: z.array(MiniTestimonialSchema), // leave this property exactly as-is in the actual file
});
```

(Only the JSDoc comments above the 5 marked fields are added — no Zod changes. The `miniTestimonials` line above is shown only as anchor context; in the real file it already has the proper schema reference, so don't replace its right-hand side.)

- [ ] **Step 2: Swap `<Edit>` to `<EditRich>` for 5 fields in OrderForm.tsx**

Open `app/_sections/OrderForm.tsx`.

Add this import at the top, next to the existing `Edit` import:

```tsx
import { Edit } from "../_editor/Edit";
import { EditRich } from "../_editor/EditRich";
```

Replace ALL FIVE of these instances, exactly as shown (only `Edit` -> `EditRich` for these specific paths; leave all other `<Edit>` calls alone):

Find:
```tsx
<Edit edit={edit} path="order.badge">{order.badge}</Edit>
```
Replace with:
```tsx
<EditRich edit={edit} path="order.badge">{order.badge}</EditRich>
```

Find:
```tsx
<Edit edit={edit} path="order.productName">{order.productName}</Edit>
```
Replace with:
```tsx
<EditRich edit={edit} path="order.productName">{order.productName}</EditRich>
```

Find:
```tsx
<Edit edit={edit} path="order.productSubtitle">{order.productSubtitle}</Edit>
```
Replace with:
```tsx
<EditRich edit={edit} path="order.productSubtitle">{order.productSubtitle}</EditRich>
```

Find:
```tsx
<Edit edit={edit} path="order.description" multiline>{order.description}</Edit>
```
Replace with:
```tsx
<EditRich edit={edit} path="order.description" multiline>{order.description}</EditRich>
```

Find:
```tsx
<Edit edit={edit} path="order.guaranteeText">{order.guaranteeText}</Edit>
```
Replace with:
```tsx
<EditRich edit={edit} path="order.guaranteeText">{order.guaranteeText}</EditRich>
```

Leave the rest of the file (CTAs, prices, secure text, mini testimonials, etc.) using the original `<Edit>`.

- [ ] **Step 3: Typecheck + test**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean + all tests pass.

- [ ] **Step 4: Commit**

```bash
git add app/_sections/OrderForm.tsx types/content.ts
git commit -m "feat(landing): migrate order box body fields to EditRich"
```

---

## Task 10 — Migrate headlines to EditRich (Feature C.8)

**Files:**
- Modify: `app/_sections/Hero.tsx`
- Modify: `app/_sections/Headline.tsx`
- Modify: `types/content.ts` (JSDoc on 5 fields)

- [ ] **Step 1: Add JSDoc on headline fields**

In `types/content.ts`, find `HeroSchema` and `HeadlineSchema`. Add the same JSDoc on these 5 fields:
- `hero.sectionTitle`, `hero.sectionBody`
- `headline.eyebrow`, `headline.h1`, `headline.sub`

Pattern (same comment each time):
```ts
/** Rich text (HTML). Allowed tags: strong, em, u, span[style=color]. */
```

- [ ] **Step 2: Swap in Hero.tsx**

Open `app/_sections/Hero.tsx`. Add the import:
```tsx
import { EditRich } from "../_editor/EditRich";
```

Replace these two specific instances:

Find:
```tsx
<Edit edit={edit} path="hero.sectionTitle">{hero.sectionTitle}</Edit>
```
Replace with:
```tsx
<EditRich edit={edit} path="hero.sectionTitle">{hero.sectionTitle}</EditRich>
```

Find:
```tsx
<Edit edit={edit} path="hero.sectionBody" multiline>{hero.sectionBody}</Edit>
```
Replace with:
```tsx
<EditRich edit={edit} path="hero.sectionBody" multiline>{hero.sectionBody}</EditRich>
```

Leave `hero.videoLabel` using `<Edit>`.

- [ ] **Step 3: Swap in Headline.tsx**

Open `app/_sections/Headline.tsx`. Add the import:
```tsx
import { EditRich } from "../_editor/EditRich";
```

Replace all 3 instances:

Find:
```tsx
<Edit edit={edit} path="headline.eyebrow">{c.eyebrow}</Edit>
```
Replace with:
```tsx
<EditRich edit={edit} path="headline.eyebrow">{c.eyebrow}</EditRich>
```

Find:
```tsx
<Edit edit={edit} path="headline.h1" multiline>{c.h1}</Edit>
```
Replace with:
```tsx
<EditRich edit={edit} path="headline.h1" multiline>{c.h1}</EditRich>
```

Find:
```tsx
<Edit edit={edit} path="headline.sub" multiline>{c.sub}</Edit>
```
Replace with:
```tsx
<EditRich edit={edit} path="headline.sub" multiline>{c.sub}</EditRich>
```

- [ ] **Step 4: Typecheck + test**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add app/_sections/Hero.tsx app/_sections/Headline.tsx types/content.ts
git commit -m "feat(landing): migrate hero + headline titles to EditRich"
```

---

## Task 11 — Migrate OnlySystem to EditRich (Feature C.9)

**Files:**
- Modify: `app/_sections/OnlySystem.tsx`
- Modify: `types/content.ts` (JSDoc on 3 fields)

- [ ] **Step 1: Add JSDoc on onlySystem fields**

In `types/content.ts`, find `OnlySystemSchema`. Add the JSDoc above `eyebrow`, `h2`, `body`:

```ts
/** Rich text (HTML). Allowed tags: strong, em, u, span[style=color]. */
eyebrow: z.string(),
/** Rich text (HTML). Allowed tags: strong, em, u, span[style=color]. */
h2: z.string(),
/** Rich text (HTML). Allowed tags: strong, em, u, span[style=color]. */
body: z.string(),
```

DO NOT add the comment on `leftFeatures.*.title`, `leftFeatures.*.body`, `rightFeatures.*.*`, `stats.*.*`, `ctaSubLink`, `guaranteeText` — those stay plain text per spec.

- [ ] **Step 2: Swap the 3 fields in OnlySystem.tsx**

Open `app/_sections/OnlySystem.tsx`. Add the import:
```tsx
import { EditRich } from "../_editor/EditRich";
```

Find:
```tsx
<Edit edit={edit} path="onlySystem.eyebrow">{c.eyebrow}</Edit>
```
Replace with:
```tsx
<EditRich edit={edit} path="onlySystem.eyebrow">{c.eyebrow}</EditRich>
```

Find:
```tsx
<Edit edit={edit} path="onlySystem.h2" multiline>{c.h2}</Edit>
```
Replace with:
```tsx
<EditRich edit={edit} path="onlySystem.h2" multiline>{c.h2}</EditRich>
```

Find:
```tsx
<Edit edit={edit} path="onlySystem.body">{c.body}</Edit>
```
Replace with:
```tsx
<EditRich edit={edit} path="onlySystem.body">{c.body}</EditRich>
```

Leave every other `<Edit>` in this file alone (leftFeatures, rightFeatures, stats, ctaSubLink, guaranteeText).

- [ ] **Step 3: Typecheck + test + commit**

```bash
npx tsc --noEmit && npx vitest run
git add app/_sections/OnlySystem.tsx types/content.ts
git commit -m "feat(landing): migrate onlySystem titles to EditRich"
```

---

## Task 12 — Migrate remaining sections to EditRich (Feature C.10)

**Files:**
- Modify: `app/_sections/FAQ.tsx`
- Modify: `app/_sections/Demo.tsx`
- Modify: `app/_sections/GuaranteeSection.tsx`
- Modify: `app/_sections/Stack.tsx`
- Modify: `app/_sections/Testimonials.tsx`
- Modify: `app/_sections/Footer.tsx`
- Modify: `types/content.ts` (JSDoc on 10 fields)

- [ ] **Step 1: Add JSDoc on the 10 remaining rich-text fields**

In `types/content.ts`, add the same JSDoc above each:
- `faq.h2`, `faq.sub`
- `demo.h2`
- `guarantee.h2`, `guarantee.body`
- `stack.h2`, `stack.guaranteeText`
- `testimonials.h2`, `testimonials.pullQuote`
- `footer.disclaimer`

JSDoc string (each time):
```ts
/** Rich text (HTML). Allowed tags: strong, em, u, span[style=color]. */
```

- [ ] **Step 2: Swap in FAQ.tsx**

Open `app/_sections/FAQ.tsx`. Add:
```tsx
import { EditRich } from "../_editor/EditRich";
```

Replace:
```tsx
<Edit edit={edit} path="faq.h2">{c.h2}</Edit>
```
with:
```tsx
<EditRich edit={edit} path="faq.h2">{c.h2}</EditRich>
```

Replace:
```tsx
<Edit edit={edit} path="faq.sub">{c.sub}</Edit>
```
with:
```tsx
<EditRich edit={edit} path="faq.sub">{c.sub}</EditRich>
```

Leave `faq.items.*.q` and `faq.items.*.a` using `<Edit>` — they stay plain text per spec.

- [ ] **Step 3: Swap in Demo.tsx**

Open `app/_sections/Demo.tsx`. Add:
```tsx
import { EditRich } from "../_editor/EditRich";
```

Replace:
```tsx
<Edit edit={edit} path="demo.h2">{c.h2}</Edit>
```
with:
```tsx
<EditRich edit={edit} path="demo.h2">{c.h2}</EditRich>
```

- [ ] **Step 4: Swap in GuaranteeSection.tsx**

Open `app/_sections/GuaranteeSection.tsx`. Add:
```tsx
import { EditRich } from "../_editor/EditRich";
```

Replace:
```tsx
<Edit edit={edit} path="guarantee.h2">{c.h2}</Edit>
```
with:
```tsx
<EditRich edit={edit} path="guarantee.h2">{c.h2}</EditRich>
```

Replace:
```tsx
<Edit edit={edit} path="guarantee.body" multiline>{c.body}</Edit>
```
with:
```tsx
<EditRich edit={edit} path="guarantee.body" multiline>{c.body}</EditRich>
```

- [ ] **Step 5: Swap in Stack.tsx**

Open `app/_sections/Stack.tsx`. Add:
```tsx
import { EditRich } from "../_editor/EditRich";
```

Replace:
```tsx
<Edit edit={edit} path="stack.h2">{c.h2}</Edit>
```
with:
```tsx
<EditRich edit={edit} path="stack.h2">{c.h2}</EditRich>
```

Replace:
```tsx
<Edit edit={edit} path="stack.guaranteeText">{c.guaranteeText}</Edit>
```
with:
```tsx
<EditRich edit={edit} path="stack.guaranteeText">{c.guaranteeText}</EditRich>
```

Leave `stack.items.*.title/sub/body/access/priceWas/priceNow` alone — they stay plain text.

- [ ] **Step 6: Swap in Testimonials.tsx**

Open `app/_sections/Testimonials.tsx`. Add:
```tsx
import { EditRich } from "../_editor/EditRich";
```

Replace:
```tsx
<Edit edit={edit} path="testimonials.h2">{c.h2}</Edit>
```
with:
```tsx
<EditRich edit={edit} path="testimonials.h2">{c.h2}</EditRich>
```

Replace:
```tsx
<Edit edit={edit} path="testimonials.pullQuote">{c.pullQuote}</Edit>
```
with:
```tsx
<EditRich edit={edit} path="testimonials.pullQuote">{c.pullQuote}</EditRich>
```

Leave `testimonials.rating` and the per-testimonial `name/role/quote` alone — they stay plain text.

- [ ] **Step 7: Swap in Footer.tsx**

Open `app/_sections/Footer.tsx`. Add:
```tsx
import { EditRich } from "../_editor/EditRich";
```

Replace:
```tsx
<Edit edit={edit} path="footer.disclaimer" multiline>{c.disclaimer}</Edit>
```
with:
```tsx
<EditRich edit={edit} path="footer.disclaimer" multiline>{c.disclaimer}</EditRich>
```

Leave `footer.earnings`, `footer.logoText`, `footer.copyright` alone.

- [ ] **Step 8: Typecheck + test**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean + all tests pass.

- [ ] **Step 9: Commit**

```bash
git add app/_sections/FAQ.tsx app/_sections/Demo.tsx app/_sections/GuaranteeSection.tsx app/_sections/Stack.tsx app/_sections/Testimonials.tsx app/_sections/Footer.tsx types/content.ts
git commit -m "feat(landing): migrate remaining section titles and paragraphs to EditRich"
```

---

## Task 13 — Final verification

This is a 3-part wrap-up. Steps 1-2 are automated; Step 3 is manual.

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: all tests pass (122 pre-existing + 11 sanitizer + 8 selection = 141).

If any failure, capture verbatim and stop.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: clean build. Same pre-existing warnings as before (middleware convention, metadataBase) are OK; any NEW warning or error is a regression to investigate.

- [ ] **Step 3: Manual smoke test (local dev — handed off to the human)**

Run: `npm run dev`. Then walk through these flows in the browser:

**A — Image slot:**
1. Open the landing in admin mode. Order box: confirm an empty image slot button appears between the blue strip and the product name.
2. Click the slot button -> upload menu opens. Upload a test image. Confirm it renders centered above the product name, max 180px tall.
3. Replace via drag-and-drop. Confirm replacement works.
4. Set alt text via the popover "Alt text" option. Confirm it persists.
5. Toggle preview mode (or open `/` in incognito) without the image set -> no image block on the public page. With the image set -> image appears above product name.

**B — Badge editability:**
1. In admin mode, click the text "NOW AVAILABLE FOR INSTANT DIGITAL DOWNLOAD" inside the blue strip. Confirm contentEditable activates.
2. Edit the text, click outside, refresh -> change persists (via autosave).

**C — Rich text formatting:**
1. In admin mode, click the H1 (`headline.h1`). Confirm contentEditable activates.
2. Select a few words -> floating toolbar appears above the selection with B / I / U / color buttons.
3. Click **B** -> selected text turns bold. Click **B** again -> bold is removed.
4. Same for **I** and **U**.
5. Click **color** -> swatch grid appears. Click a swatch -> selected text takes the color.
6. Click "x Clear" inside the color view -> color is removed.
7. Press Escape -> editor closes; toolbar disappears.
8. Repeat on a button label (e.g. CTA in the order box) -> confirm NO toolbar appears (it's a plain `<Edit>` field, not `<EditRich>`).
9. Save the draft (auto). Click Publish.
10. Open the public page in incognito -> confirm the bold/italic/color renders correctly.

**D — Sanitization check (security):**
1. In admin, open the H1 editor. Manually type literal angle brackets like `<script>alert(1)</script>` (use the keyboard, not paste — paste is intercepted to plain text). The text appears.
2. Publish.
3. Open the public page -> confirm NO alert fires; the `<script>` text is rendered as escaped plain text or stripped, NOT executed.

- [ ] **Step 4: Confirmation commit**

If everything in Step 3 passed, no extra commit needed — the feature is done. If you found a smoke-test bug, FIX IT in its appropriate task's scope and re-test.

- [ ] **Step 5: Push**

```bash
git push
```

---

## Out of scope (tracked in spec backlog)

- Migrate FAQ answers / stack item bodies / testimonial quotes to rich text
- Hyperlinks in rich text
- Alignment / lists / headings / arbitrary colors
- Per-section image slots beyond the order box
- Section spacing control
- Hide/restore for individual texts
- Video upload bug fix
- New section types (Shortcuts, etc.)
