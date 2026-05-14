# Landing Page Block Editor — Phase 4: Editable & Reorderable Lists

> **For agentic workers:** Execute task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make every repeating list inside a section editable on the landing — add an item, remove an item, drag to reorder. This is where "changer le nombre de photos / vidéos" actually lives (more/fewer testimonials, FAQ entries, logos, features, stack items).

**Architecture:** `RepeatableList` is rewritten to: (a) in non-edit mode render items plainly with **zero** extra DOM — keeping public output identical; (b) in edit mode wrap each item in a `@dnd-kit` sortable cell with a drag handle (⠿) and a remove (×) button, plus an "+ Add" button. It is `SectionContext`-aware so `path` is section-relative. Section components wrap their existing `.map()` bodies in `<RepeatableList>`; the `.map` body becomes the render prop, otherwise unchanged.

**Tech Stack:** `@dnd-kit/*` (added in Phase 2).

**Scope note:** Lists live inside layout-sensitive containers (`.ac-testi__grid` uses CSS multi-column; others use grid/flex). The edit-mode wrapper carries `break-inside: avoid` so multi-column still flows correctly. Public (non-edit) rendering adds no wrappers at all, so there is no visual risk off the editor. The editor canvas should still be eyeballed in a browser (Task 9).

---

## File Structure

**Modified:**
- `app/_editor/styles.module.css` — `.itemDrag` handle style, `.sortableCell` wrapper
- `app/_editor/RepeatableList.tsx` — full rewrite (dnd-kit sortable + add/remove, edit-gated)
- `app/_sections/Testimonials.tsx`, `FAQ.tsx`, `LogoStrip.tsx`, `OnlySystem.tsx`, `Stack.tsx`, `OrderForm.tsx` — wrap lists in `RepeatableList`

---

## Task 1: Styles for sortable list items

**Files:** Modify `app/_editor/styles.module.css`

- [ ] **Step 1: Append to `app/_editor/styles.module.css`**

```css
.sortableCell {
  position: relative;
  break-inside: avoid;
}
.itemDrag {
  position: absolute; top: -8px; left: -8px;
  background: #fff; border: 1px solid #ddd; border-radius: 999px;
  width: 24px; height: 24px; display: grid; place-items: center;
  cursor: grab; opacity: 0; transition: opacity 120ms;
  z-index: 6; font-size: 12px; color: #71717a; line-height: 1;
}
.sortableCell:hover .itemDrag { opacity: 1; }
```

- [ ] **Step 2: Commit**

```bash
git add app/_editor/styles.module.css
git commit -m "feat(editor): styles for sortable list cells"
```

---

## Task 2: Rewrite `RepeatableList`

**Files:** Modify `app/_editor/RepeatableList.tsx`

- [ ] **Step 1: Replace the whole file**

```tsx
"use client";
import { Fragment, type ReactNode } from "react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, rectSortingStrategy,
  useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEditor } from "./EditorProvider";
import { useSectionPath } from "./SectionContext";
import styles from "./styles.module.css";

function resolve(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>(
    (acc, k) => (acc as Record<string, unknown> | undefined)?.[k.match(/^\d+$/) ? Number(k) : (k as string)],
    obj,
  );
}

export function RepeatableList({
  path,
  newItem,
  edit,
  children,
}: {
  path: string;
  newItem: unknown;
  edit: boolean;
  children: (i: number) => ReactNode;
}) {
  const { state, setField } = useEditor();
  const fullPath = useSectionPath(path);
  const arr = (resolve(state.draft, fullPath) as unknown[] | undefined) ?? [];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Non-edit: render items exactly as before, no extra DOM.
  if (!edit) {
    return <>{arr.map((_, i) => <Fragment key={i}>{children(i)}</Fragment>)}</>;
  }

  function add() {
    setField(fullPath, [...arr, structuredClone(newItem)]);
  }
  function remove(i: number) {
    setField(fullPath, arr.filter((_, idx) => idx !== i));
  }
  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = Number(active.id);
    const to = Number(over.id);
    if (Number.isNaN(from) || Number.isNaN(to)) return;
    setField(fullPath, arrayMove(arr, from, to));
  }

  const ids = arr.map((_, i) => String(i));

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={rectSortingStrategy}>
          {arr.map((_, i) => (
            <SortableCell key={i} id={String(i)} onRemove={() => remove(i)}>
              {children(i)}
            </SortableCell>
          ))}
        </SortableContext>
      </DndContext>
      <button className={styles.addItem} type="button" onClick={add}>+ Add</button>
    </>
  );
}

function SortableCell({
  id,
  onRemove,
  children,
}: {
  id: string;
  onRemove: () => void;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      className={styles.sortableCell}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
      }}
    >
      <button
        type="button"
        className={styles.itemDrag}
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        ⠿
      </button>
      <button
        type="button"
        className={styles.itemRemove}
        onClick={onRemove}
        aria-label="Remove"
      >
        ×
      </button>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Type-check** — `npx tsc --noEmit`, expect no errors (nothing imports `RepeatableList` yet — still green).

- [ ] **Step 3: Commit**

```bash
git add app/_editor/RepeatableList.tsx
git commit -m "feat(editor): RepeatableList — dnd-kit reorder + add/remove, edit-gated"
```

---

## Task 3–8: Wire `RepeatableList` into section lists

For **each** list below the transformation is the same pattern. Given a section component with:

```tsx
<Container>
  {c.someList.map((item, i) => (
    <ItemJSX key={i} ... uses `item` ... />
  ))}
</Container>
```

rewrite it to:

```tsx
<Container>
  <RepeatableList path="<relativePath>" newItem={<DEFAULT>} edit={edit}>
    {(i) => {
      const item = c.someList[i];
      return <ItemJSX key={i} ... uses `item` ... />;
    }}
  </RepeatableList>
</Container>
```

Add `import { RepeatableList } from "../_editor/RepeatableList";` to each file. The `path` is **section-relative** (the same prefix the existing `<Edit path="...">` calls already use in that file). Keep every existing `<Edit>` / `<MediaSlot>` path inside the item body **unchanged** — they still address `c.someList.${i}...` and resolve correctly.

### Task 3: `Testimonials.tsx`

**File:** `app/_sections/Testimonials.tsx`

- [ ] **Step 1** Add import: `import { RepeatableList } from "../_editor/RepeatableList";`
- [ ] **Step 2** Wrap the `c.items.map((t, i) => ( ... ))` inside `<div className="ac-testi__grid">` with:
  ```tsx
  <RepeatableList
    path="testimonials.items"
    newItem={{ type: "text", avatar: "", name: "Name", role: "Role", quote: "New testimonial quote.", highlights: [] }}
    edit={edit}
  >
    {(i) => {
      const t = c.items[i];
      return ( /* the existing <Reveal …> … </Reveal> JSX, unchanged, still using `t` and `i` */ );
    }}
  </RepeatableList>
  ```
- [ ] **Step 3** Type-check: `npx tsc --noEmit` — expect no errors.
- [ ] **Step 4** Commit: `git add app/_sections/Testimonials.tsx && git commit -m "feat(testimonials): editable + reorderable items"`

### Task 4: `FAQ.tsx`

**File:** `app/_sections/FAQ.tsx`

- [ ] **Step 1** Add import: `import { RepeatableList } from "../_editor/RepeatableList";`
- [ ] **Step 2** Wrap `c.items.map((q, i) => ( ... ))` inside `<div className="ac-faq__grid">` with:
  ```tsx
  <RepeatableList path="faq.items" newItem={{ q: "New question?", a: "Answer." }} edit={edit}>
    {(i) => { const q = c.items[i]; return ( /* existing <Reveal> JSX */ ); }}
  </RepeatableList>
  ```
- [ ] **Step 3** Type-check — expect no errors.
- [ ] **Step 4** Commit: `git add app/_sections/FAQ.tsx && git commit -m "feat(faq): editable + reorderable items"`

### Task 5: `LogoStrip.tsx`

**File:** `app/_sections/LogoStrip.tsx`

- [ ] **Step 1** Add import: `import { RepeatableList } from "../_editor/RepeatableList";`
- [ ] **Step 2** Wrap `c.logos.map((l, i) => ( ... ))` inside `<div className="ac-authority__row">` with:
  ```tsx
  <RepeatableList path="authority.logos" newItem={"Logo"} edit={edit}>
    {(i) => { const l = c.logos[i]; return ( /* existing <Reveal …> JSX */ ); }}
  </RepeatableList>
  ```
- [ ] **Step 3** Type-check — expect no errors.
- [ ] **Step 4** Commit: `git add app/_sections/LogoStrip.tsx && git commit -m "feat(logostrip): editable + reorderable logos"`

### Task 6: `OnlySystem.tsx` (three lists)

**File:** `app/_sections/OnlySystem.tsx`

- [ ] **Step 1** Add import: `import { RepeatableList } from "../_editor/RepeatableList";`
- [ ] **Step 2** Wrap `c.leftFeatures.map((f, i) => …)` inside `<div className="ac-only__col ac-only__col--left">`:
  ```tsx
  <RepeatableList path="onlySystem.leftFeatures" newItem={{ title: "New feature", body: "" }} edit={edit}>
    {(i) => { const f = c.leftFeatures[i]; return ( /* existing <div key={i}> JSX */ ); }}
  </RepeatableList>
  ```
- [ ] **Step 3** Wrap `c.rightFeatures.map((f, i) => …)` inside `<div className="ac-only__col ac-only__col--right">`:
  ```tsx
  <RepeatableList path="onlySystem.rightFeatures" newItem={{ title: "New feature", body: "" }} edit={edit}>
    {(i) => { const f = c.rightFeatures[i]; return ( /* existing <div key={i}> JSX */ ); }}
  </RepeatableList>
  ```
- [ ] **Step 4** Wrap `c.stats.map((s, i) => …)` inside `<Reveal className="ac-only__stats" …>`:
  ```tsx
  <RepeatableList path="onlySystem.stats" newItem={{ value: "0", label: "Label" }} edit={edit}>
    {(i) => { const s = c.stats[i]; return ( /* existing <div className="ac-only__stat" key={i}> JSX */ ); }}
  </RepeatableList>
  ```
- [ ] **Step 5** Type-check — expect no errors.
- [ ] **Step 6** Commit: `git add app/_sections/OnlySystem.tsx && git commit -m "feat(onlysystem): editable + reorderable features and stats"`

### Task 7: `Stack.tsx`

**File:** `app/_sections/Stack.tsx`

- [ ] **Step 1** Add import: `import { RepeatableList } from "../_editor/RepeatableList";`
- [ ] **Step 2** Wrap `c.items.map((it, i) => …)` inside `<div className="ac-stack__grid">` with:
  ```tsx
  <RepeatableList
    path="stack.items"
    newItem={{ kind: "book", title: "New item", sub: "", body: "", access: "Instant Access", priceWas: "", priceNow: "Free" }}
    edit={edit}
  >
    {(i) => { const it = c.items[i]; return ( /* existing <Reveal …> JSX */ ); }}
  </RepeatableList>
  ```
- [ ] **Step 3** Type-check — expect no errors.
- [ ] **Step 4** Commit: `git add app/_sections/Stack.tsx && git commit -m "feat(stack): editable + reorderable items"`

### Task 8: `OrderForm.tsx`

**File:** `app/_sections/OrderForm.tsx`

- [ ] **Step 1** Add import: `import { RepeatableList } from "../_editor/RepeatableList";`
- [ ] **Step 2** Wrap `order.miniTestimonials.map((t, i) => …)` inside `<div className="ac-order__mini-testimonials">` with:
  ```tsx
  <RepeatableList path="order.miniTestimonials" newItem={{ avatar: "", name: "Name", role: "Role", quote: "Short quote." }} edit={edit}>
    {(i) => { const t = order.miniTestimonials[i]; return ( /* existing <div className="ac-order__mini-card" key={i}> JSX */ ); }}
  </RepeatableList>
  ```
- [ ] **Step 3** Type-check + build: `npx tsc --noEmit && npm run build` — expect both green.
- [ ] **Step 4** Commit: `git add app/_sections/OrderForm.tsx && git commit -m "feat(orderform): editable + reorderable mini-testimonials"`

---

## Task 9: Manual verification

- [ ] **Step 1** `npm run dev`, open the landing in edit mode.
- [ ] **Step 2** For Testimonials, FAQ, Logo Strip, Only System (features + stats), Stack, and the Order form mini-testimonials:
  - A "+ Add" button shows after each list; clicking it appends a blank item.
  - Hovering an item shows a ⠿ handle (top-left) and × remove (top-right).
  - Dragging the ⠿ handle reorders the item; the change marks the draft dirty.
  - × removes the item.
  - Editing text / swapping media inside an item still works and saves to the right index.
- [ ] **Step 3** Open the public page (non-edit): every list renders exactly as before — no handles, no add buttons, no extra spacing or broken columns (especially the Testimonials multi-column grid).
- [ ] **Step 4** Report any discrepancy; otherwise Phase 4 is complete.
