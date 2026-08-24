"use client";
import { Children, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
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
import { useSectionPath, useStableFieldKey } from "./SectionContext";
import { identityIndexMap, moveIndexMap, removalIndexMap } from "./listKeys";
import styles from "./styles.module.css";

function resolve(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>(
    (acc, k) => (acc as Record<string, unknown> | undefined)?.[k.match(/^\d+$/) ? Number(k) : (k as string)],
    obj,
  );
}

/**
 * Wraps a list of pre-rendered item elements. In non-edit mode it is a
 * transparent pass-through (no hooks, no extra DOM) so it is safe to render
 * on the public page where there is no EditorProvider. In edit mode it
 * delegates to EditableRepeatableList which adds drag-reorder + add/remove.
 */
export function RepeatableList({
  path,
  newItem,
  edit,
  children,
}: {
  path: string;
  newItem: unknown;
  edit: boolean;
  children: ReactNode;
}) {
  if (!edit) return <>{children}</>;
  return (
    <EditableRepeatableList path={path} newItem={newItem}>
      {children}
    </EditableRepeatableList>
  );
}

function EditableRepeatableList({
  path,
  newItem,
  children,
}: {
  path: string;
  newItem: unknown;
  children: ReactNode;
}) {
  const { state, mutateList } = useEditor();
  const fullPath = useSectionPath(path);
  // hiddenFields / imageSizes are keyed by section id, not by draft path, so
  // the prefix used to find this list's metadata differs from `fullPath`.
  const keyPrefix = useStableFieldKey(path);
  const arr = (resolve(state.draft, fullPath) as unknown[] | undefined) ?? [];
  const items = Children.toArray(children);
  const [dragging, setDragging] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function add() {
    // The appended slot inherits no metadata: the identity map has no entry for
    // it, so any hiddenFields left over from an item previously deleted at that
    // index is dropped instead of blanking out the brand-new card.
    mutateList(fullPath, [...arr, structuredClone(newItem)], keyPrefix, identityIndexMap(arr.length));
  }
  function remove(i: number) {
    mutateList(fullPath, arr.filter((_, idx) => idx !== i), keyPrefix, removalIndexMap(arr.length, i));
  }
  function onDragEnd(e: DragEndEvent) {
    setDragging(false);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = Number(active.id);
    const to = Number(over.id);
    if (Number.isNaN(from) || Number.isNaN(to)) return;
    mutateList(fullPath, arrayMove(arr, from, to), keyPrefix, moveIndexMap(arr.length, from, to));
  }

  const ids = items.map((_, i) => String(i));

  return (
    <>
      {/* id={fullPath} keeps DndContext's auto-generated aria-describedby IDs
          stable between SSR and CSR. Without it dnd-kit's internal counter
          ticks differently in dev (StrictMode double-renders) and causes a
          hydration mismatch on every drag handle. */}
      <DndContext
        id={fullPath}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={() => setDragging(true)}
        onDragCancel={() => setDragging(false)}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={ids} strategy={rectSortingStrategy}>
          {items.map((child, i) => (
            <SortableCell key={i} id={String(i)} onRemove={() => remove(i)}>
              {child}
            </SortableCell>
          ))}
        </SortableContext>
      </DndContext>
      {/* Cards can embed third-party <iframe> players (testimonial videos).
          A cross-origin iframe swallows pointermove, so the drag freezes the
          moment the cursor crosses one and the drop lands nowhere. This shield
          sits above everything for the duration of the drag; dnd-kit resolves
          drop targets from measured rects, not hit-testing, so covering the
          page costs nothing. */}
      {dragging && typeof document !== "undefined" && createPortal(
        <div
          aria-hidden="true"
          style={{ position: "fixed", inset: 0, zIndex: 2147483000, cursor: "grabbing" }}
        />,
        document.body,
      )}
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
        zIndex: isDragging ? 100 : undefined,
      }}
    >
      <button
        type="button"
        className={styles.itemDrag}
        {...attributes}
        {...listeners}
        // Without this the browser scrolls the page instead of starting the
        // drag on touch/trackpad-gesture devices.
        style={{ touchAction: "none", cursor: isDragging ? "grabbing" : "grab" }}
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
