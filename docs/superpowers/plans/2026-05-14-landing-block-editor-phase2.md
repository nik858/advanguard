# Landing Page Block Editor — Phase 2: Structure Sidebar

> **For agentic workers:** Execute task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A minimal collapsible "Structure" sidebar in the editor to reorder, hide, add, duplicate and delete sections — plus a light hover frame so the editor knows which block they're in.

**Architecture:** New reducer actions on `EditorProvider` operate on `draft.sections` (reorder by id, hide, add, duplicate, remove). A reusable `SortableList` wraps `@dnd-kit`. `StructurePanel` (collapsible, fixed left) renders one `SectionRow` per section. `createSection(type)` in `types/content.ts` produces valid default data. Public render already filters `hidden` (Phase 1).

**Tech Stack:** `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.

---

## File Structure

**Created:**
- `app/_editor/SortableList.tsx` — generic `@dnd-kit` vertical sortable list (render-prop API, reused in Phase 4)
- `app/_editor/StructurePanel.tsx` — the collapsible sidebar
- `app/_editor/SectionRow.tsx` — one row: drag handle, label, hide toggle, ⋯ menu
- `app/_editor/AddSectionMenu.tsx` — "+ Add a section" dropdown
- `app/_editor/SectionHoverFrame.tsx` — hover outline + section-name label around each editor section

**Modified:**
- `package.json` — add dnd-kit
- `types/content.ts` — `SECTION_LABELS`, `createSection(type)`
- `app/_editor/types.ts` — new `EditorAction` variants
- `app/_editor/EditorProvider.tsx` — reducer cases + context methods
- `app/_editor/LandingTree.tsx` — render `StructurePanel`, wrap sections in `SectionHoverFrame`

---

## Task 1: Add dnd-kit dependencies

**Files:** Modify `package.json`

- [ ] **Step 1: Install**

Run: `npm install @dnd-kit/core@^6 @dnd-kit/sortable@^10 @dnd-kit/utilities@^3`

- [ ] **Step 2: Verify install + build still green**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @dnd-kit for sortable lists"
```

---

## Task 2: `createSection` + section labels

**Files:** Modify `types/content.ts`

- [ ] **Step 1: Append to `types/content.ts`** (after `findSection`)

```ts
/** Human-readable labels for the structure sidebar. */
export const SECTION_LABELS: Record<SectionType, string> = {
  headline: "Headline",
  hero: "Hero + Order",
  authority: "Logo Strip",
  onlySystem: "Only System",
  demo: "Demo",
  testimonials: "Testimonials",
  stack: "Stack",
  guarantee: "Guarantee",
  faq: "FAQ",
};

/** Canonical order used when offering "add a section". */
export const SECTION_TYPES: SectionType[] = [
  "headline", "hero", "authority", "onlySystem", "demo",
  "testimonials", "stack", "guarantee", "faq",
];

/** Builds a new section of the given type with valid default (placeholder) data. */
export function createSection(type: SectionType): Section {
  const id = genSectionId();
  switch (type) {
    case "headline":
      return { id, type, data: { headline: { eyebrow: "Eyebrow text", eyebrowDotColor: "rgb(28,127,255)", h1: "New headline", sub: "Subtitle" } } };
    case "hero":
      return {
        id, type,
        data: {
          hero: { videoLabel: "Watch the video", videoUrl: "", videoPoster: "", sectionTitle: "Section title", sectionBody: "Body text" },
          order: { badge: "", productName: "Product", productSubtitle: "", limitedTime: "", priceWas: "", priceNow: "", priceSubLine: "", description: "", ctaTagline: "", ctaLabel: "Buy now", secureText: "", guaranteeText: "", ratingText: "", miniTestimonials: [] },
        },
      };
    case "authority":
      return { id, type, data: { authority: { title: "Featured in", logos: [] } } };
    case "onlySystem":
      return { id, type, data: { onlySystem: { eyebrow: "", eyebrowDotColor: "rgb(28,127,255)", h2: "Heading", body: "", leftFeatures: [], rightFeatures: [], stats: [], ctaTagline: "", ctaLabel: "Buy now", ctaSubLink: "", guaranteeText: "" } } };
    case "demo":
      return { id, type, data: { demo: { h2: "Demo", videoUrl: "", videoPoster: "" } } };
    case "testimonials":
      return { id, type, data: { testimonials: { rating: "", h2: "What people say", pullQuote: "", items: [] } } };
    case "stack":
      return { id, type, data: { stack: { h2: "What you get", bigStackImg: "", items: [], ctaTagline: "", ctaLabel: "Buy now", guaranteeText: "" } } };
    case "guarantee":
      return { id, type, data: { guarantee: { h2: "Our guarantee", body: "" } } };
    case "faq":
      return { id, type, data: { faq: { h2: "FAQ", sub: "", items: [] } } };
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit` — expect no errors.

- [ ] **Step 3: Commit**

```bash
git add types/content.ts
git commit -m "feat(content): createSection defaults + section labels"
```

---

## Task 3: Editor reducer actions for section structure

**Files:** Modify `app/_editor/types.ts`, `app/_editor/EditorProvider.tsx`

- [ ] **Step 1: Add action variants in `app/_editor/types.ts`**

Add to the `EditorAction` union:
```ts
  | { type: "reorderSections"; order: string[] }
  | { type: "setSectionHidden"; id: string; hidden: boolean }
  | { type: "addSection"; section: import("@/types/content").Section }
  | { type: "duplicateSection"; id: string }
  | { type: "removeSection"; id: string }
```

- [ ] **Step 2: Add reducer cases in `EditorProvider.tsx`**

Add this helper above `reducer`:
```ts
function withDraft(state: EditorState, draft: Content): EditorState {
  const dirty = JSON.stringify(draft) !== JSON.stringify(state.baseline);
  return { ...state, draft, dirty, lastSaveAt: dirty ? null : state.lastSaveAt };
}
```

Add these cases inside `reducer`'s `switch` (before the closing brace):
```ts
    case "reorderSections": {
      const byId = new Map(state.draft.sections.map((s) => [s.id, s]));
      const sections = action.order
        .map((id) => byId.get(id))
        .filter((s): s is NonNullable<typeof s> => Boolean(s));
      return withDraft(state, { ...state.draft, sections });
    }
    case "setSectionHidden": {
      const sections = state.draft.sections.map((s) =>
        s.id === action.id ? { ...s, hidden: action.hidden } : s
      );
      return withDraft(state, { ...state.draft, sections });
    }
    case "addSection":
      return withDraft(state, { ...state.draft, sections: [...state.draft.sections, action.section] });
    case "duplicateSection": {
      const idx = state.draft.sections.findIndex((s) => s.id === action.id);
      if (idx < 0) return state;
      const orig = state.draft.sections[idx];
      const copy = { ...structuredClone(orig), id: genSectionId() };
      const sections = [...state.draft.sections];
      sections.splice(idx + 1, 0, copy);
      return withDraft(state, { ...state.draft, sections });
    }
    case "removeSection": {
      const sections = state.draft.sections.filter((s) => s.id !== action.id);
      return withDraft(state, { ...state.draft, sections });
    }
```

Update the `migrateContent` import line to also import `genSectionId`:
```ts
import { migrateContent, genSectionId, createSection } from "@/types/content";
```

- [ ] **Step 3: Expose context methods**

In the `EditorContextValue` type, add:
```ts
  reorderSections: (order: string[]) => void;
  setSectionHidden: (id: string, hidden: boolean) => void;
  addSection: (type: import("@/types/content").SectionType) => void;
  duplicateSection: (id: string) => void;
  removeSection: (id: string) => void;
```

In the `useMemo` value object, add:
```ts
    reorderSections: (order) => dispatch({ type: "reorderSections", order }),
    setSectionHidden: (id, hidden) => dispatch({ type: "setSectionHidden", id, hidden }),
    addSection: (type) => dispatch({ type: "addSection", section: createSection(type) }),
    duplicateSection: (id) => dispatch({ type: "duplicateSection", id }),
    removeSection: (id) => dispatch({ type: "removeSection", id }),
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit` — expect no errors.

- [ ] **Step 5: Commit**

```bash
git add app/_editor/types.ts app/_editor/EditorProvider.tsx
git commit -m "feat(editor): reducer actions for section reorder/hide/add/duplicate/remove"
```

---

## Task 4: `SortableList` — reusable dnd-kit wrapper

**Files:** Create `app/_editor/SortableList.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ReactNode, CSSProperties } from "react";

export type SortableHandle = {
  attributes: Record<string, unknown>;
  listeners: Record<string, unknown> | undefined;
  isDragging: boolean;
};

export function SortableList({
  ids,
  onReorder,
  children,
}: {
  ids: string[];
  onReorder: (ids: string[]) => void;
  children: (id: string, handle: SortableHandle) => ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(ids, oldIndex, newIndex));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {ids.map((id) => (
          <SortableRow key={id} id={id}>{children}</SortableRow>
        ))}
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  id,
  children,
}: {
  id: string;
  children: (id: string, handle: SortableHandle) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children(id, { attributes, listeners, isDragging })}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit` — expect no errors.

- [ ] **Step 3: Commit**

```bash
git add app/_editor/SortableList.tsx
git commit -m "feat(editor): reusable SortableList dnd-kit wrapper"
```

---

## Task 5: `AddSectionMenu`

**Files:** Create `app/_editor/AddSectionMenu.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";
import { useState } from "react";
import { useEditor } from "./EditorProvider";
import { SECTION_TYPES, SECTION_LABELS, type SectionType } from "@/types/content";

export function AddSectionMenu() {
  const { addSection } = useEditor();
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          background: "#fff",
          border: "1px dashed var(--adv-accent, #1c7bfd)",
          color: "var(--adv-accent, #1c7bfd)",
          borderRadius: 8,
          padding: "8px 12px",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 600,
          fontFamily: "inherit",
        }}
      >
        + Add a section
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid var(--adv-border, #e7e7ea)",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,.12)",
            padding: 4,
            zIndex: 10,
          }}
        >
          {SECTION_TYPES.map((t: SectionType) => (
            <button
              key={t}
              type="button"
              onClick={() => { addSection(t); setOpen(false); }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                background: "transparent",
                border: 0,
                padding: "7px 10px",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 13,
                fontFamily: "inherit",
                color: "var(--adv-text, #18181b)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f7")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {SECTION_LABELS[t]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit` — expect no errors.

- [ ] **Step 3: Commit**

```bash
git add app/_editor/AddSectionMenu.tsx
git commit -m "feat(editor): AddSectionMenu"
```

---

## Task 6: `SectionRow`

**Files:** Create `app/_editor/SectionRow.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";
import { useState } from "react";
import { useEditor } from "./EditorProvider";
import { ConfirmDialog } from "../_components/ConfirmDialog";
import { SECTION_LABELS } from "@/types/content";
import type { Section } from "@/types/content";
import type { SortableHandle } from "./SortableList";

export function SectionRow({ section, handle }: { section: Section; handle: SortableHandle }) {
  const { setSectionHidden, duplicateSection, removeSection } = useEditor();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const hidden = Boolean(section.hidden);

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 8px",
          marginBottom: 4,
          borderRadius: 6,
          border: "1px solid var(--adv-border, #e7e7ea)",
          background: "#fff",
          opacity: hidden ? 0.5 : 1,
          fontSize: 13,
        }}
      >
        <button
          type="button"
          {...handle.attributes}
          {...handle.listeners}
          aria-label="Drag to reorder"
          style={{
            cursor: "grab",
            background: "transparent",
            border: 0,
            color: "var(--adv-text-muted, #71717a)",
            fontSize: 14,
            lineHeight: 1,
            padding: 2,
          }}
        >
          ⠿
        </button>
        <span style={{ flex: 1, fontWeight: 500, color: "var(--adv-text, #18181b)" }}>
          {SECTION_LABELS[section.type]}
        </span>
        <button
          type="button"
          onClick={() => setSectionHidden(section.id, !hidden)}
          aria-label={hidden ? "Show section" : "Hide section"}
          title={hidden ? "Show" : "Hide"}
          style={{ background: "transparent", border: 0, cursor: "pointer", fontSize: 13, padding: 2 }}
        >
          {hidden ? "🙈" : "👁"}
        </button>
        <div style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="More actions"
            style={{ background: "transparent", border: 0, cursor: "pointer", fontSize: 15, padding: 2, lineHeight: 1 }}
          >
            ⋯
          </button>
          {menuOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                right: 0,
                background: "#fff",
                border: "1px solid var(--adv-border, #e7e7ea)",
                borderRadius: 6,
                boxShadow: "0 8px 24px rgba(0,0,0,.12)",
                padding: 4,
                zIndex: 20,
                minWidth: 120,
              }}
            >
              <button
                type="button"
                onClick={() => { duplicateSection(section.id); setMenuOpen(false); }}
                style={menuItemStyle}
              >
                Duplicate
              </button>
              <button
                type="button"
                onClick={() => { setMenuOpen(false); setConfirmOpen(true); }}
                style={{ ...menuItemStyle, color: "#c62828" }}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title={`Delete "${SECTION_LABELS[section.type]}"?`}
        description="This section will be removed from the page. You can still discard all changes before publishing."
        confirmLabel="Delete section"
        cancelLabel="Keep it"
        destructive
        onConfirm={() => { removeSection(section.id); setConfirmOpen(false); }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}

const menuItemStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  background: "transparent",
  border: 0,
  padding: "6px 10px",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 13,
  fontFamily: "inherit",
};
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit` — expect no errors.

- [ ] **Step 3: Commit**

```bash
git add app/_editor/SectionRow.tsx
git commit -m "feat(editor): SectionRow with hide/duplicate/delete"
```

---

## Task 7: `StructurePanel`

**Files:** Create `app/_editor/StructurePanel.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";
import { useState } from "react";
import { useEditor } from "./EditorProvider";
import { SortableList } from "./SortableList";
import { SectionRow } from "./SectionRow";
import { AddSectionMenu } from "./AddSectionMenu";

export function StructurePanel() {
  const { state, reorderSections } = useEditor();
  const [open, setOpen] = useState(false);

  if (state.previewMode) return null;
  const sections = state.draft.sections;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Section structure"
        style={{
          position: "fixed",
          left: 0,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 90,
          background: "#fff",
          border: "1px solid var(--adv-border, #e7e7ea)",
          borderLeft: 0,
          borderRadius: "0 8px 8px 0",
          padding: "12px 6px",
          cursor: "pointer",
          writingMode: "vertical-rl",
          fontSize: 12,
          fontWeight: 600,
          fontFamily: "var(--adv-font, system-ui, sans-serif)",
          color: "var(--adv-text, #18181b)",
          boxShadow: "0 2px 12px rgba(0,0,0,.08)",
        }}
      >
        ⠿ Structure
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        bottom: 0,
        width: 260,
        zIndex: 90,
        background: "rgba(255,255,255,0.97)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRight: "1px solid var(--adv-border, #e7e7ea)",
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        fontFamily: "var(--adv-font, system-ui, sans-serif)",
        overflowY: "auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <strong style={{ fontSize: 13, color: "var(--adv-text, #18181b)" }}>Structure</strong>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close structure panel"
          style={{ background: "transparent", border: 0, cursor: "pointer", fontSize: 16, lineHeight: 1, color: "var(--adv-text-muted, #71717a)" }}
        >
          ‹
        </button>
      </div>

      <div style={{ flex: 1 }}>
        <SortableList ids={sections.map((s) => s.id)} onReorder={reorderSections}>
          {(id, handle) => {
            const section = sections.find((s) => s.id === id);
            if (!section) return null;
            return <SectionRow section={section} handle={handle} />;
          }}
        </SortableList>
      </div>

      <AddSectionMenu />
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit` — expect no errors.

- [ ] **Step 3: Commit**

```bash
git add app/_editor/StructurePanel.tsx
git commit -m "feat(editor): collapsible StructurePanel sidebar"
```

---

## Task 8: `SectionHoverFrame`

**Files:** Create `app/_editor/SectionHoverFrame.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";
import { useState, type ReactNode } from "react";
import { useEditor } from "./EditorProvider";
import { SECTION_LABELS, type SectionType } from "@/types/content";

export function SectionHoverFrame({ type, children }: { type: SectionType; children: ReactNode }) {
  const { state } = useEditor();
  const [hover, setHover] = useState(false);

  if (state.previewMode) return <>{children}</>;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        outline: hover ? "2px solid rgba(28,123,253,0.4)" : "2px solid transparent",
        outlineOffset: -2,
        transition: "outline-color 120ms",
      }}
    >
      {hover && (
        <span
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            zIndex: 80,
            background: "var(--adv-accent, #1c7bfd)",
            color: "#fff",
            fontSize: 11,
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: "0 0 6px 0",
            fontFamily: "var(--adv-font, system-ui, sans-serif)",
            pointerEvents: "none",
          }}
        >
          {SECTION_LABELS[type]}
        </span>
      )}
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit` — expect no errors.

- [ ] **Step 3: Commit**

```bash
git add app/_editor/SectionHoverFrame.tsx
git commit -m "feat(editor): SectionHoverFrame outline + label"
```

---

## Task 9: Wire panel + hover frame into `LandingTree`

**Files:** Modify `app/_editor/LandingTree.tsx`

- [ ] **Step 1: Rewrite `LandingTree.tsx`**

```tsx
"use client";
import { useEditor } from "./EditorProvider";
import { ToastProvider } from "../_components/Toast";
import { Header } from "../_sections/Header";
import { Footer } from "../_sections/Footer";
import { SectionBody } from "../_sections/SectionBody";
import { SectionContextProvider } from "./SectionContext";
import { SectionHoverFrame } from "./SectionHoverFrame";
import { StructurePanel } from "./StructurePanel";
import { PublishBar } from "./PublishBar";

export function LandingTree() {
  const { state } = useEditor();
  const c = state.draft;
  return (
    <ToastProvider>
      <PublishBar />
      <StructurePanel />
      <Header content={c.header} edit />
      <main id="main">
        {c.sections.map((s, i) => (
          <SectionContextProvider key={s.id} value={{ basePath: `sections.${i}.data` }}>
            <SectionHoverFrame type={s.type}>
              <SectionBody section={s} edit />
            </SectionHoverFrame>
          </SectionContextProvider>
        ))}
      </main>
      <Footer content={c.footer} header={c.header} edit />
    </ToastProvider>
  );
}
```

Note: the editor shows hidden sections too (greyed via `SectionRow` opacity in the sidebar; still rendered in the canvas so they remain editable). Only the public page filters `hidden`.

- [ ] **Step 2: Type-check + build**

Run: `npx tsc --noEmit && npm run build` — expect both green.

- [ ] **Step 3: Commit**

```bash
git add app/_editor/LandingTree.tsx
git commit -m "feat(editor): mount StructurePanel and SectionHoverFrame"
```

---

## Task 10: Manual verification

- [ ] **Step 1: Dev server**

Run: `npm run dev`, open the landing in edit mode.

- [ ] **Step 2: Verify**

  - The "⠿ Structure" tab shows at the left edge; clicking opens the panel with 9 rows.
  - Drag a row → section order changes live in the canvas; PublishBar shows unpublished changes.
  - Eye toggle greys the row; the section stays in the editor canvas.
  - "+ Add a section" → pick a type → new section appended; drag it into place.
  - ⋯ → Duplicate inserts a copy right after; ⋯ → Delete asks for confirmation then removes.
  - Hovering a section in the canvas shows the blue outline + name label.
  - Reload: debounced draft restores the new structure.
  - Open the public page (non-edit) → hidden sections are absent; others render in the new order.

- [ ] **Step 3: Report** any discrepancy; otherwise Phase 2 is complete.
