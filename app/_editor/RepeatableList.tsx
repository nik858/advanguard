"use client";
import { Children, type ReactNode } from "react";
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
  const { state, setField } = useEditor();
  const fullPath = useSectionPath(path);
  const arr = (resolve(state.draft, fullPath) as unknown[] | undefined) ?? [];
  const items = Children.toArray(children);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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

  const ids = items.map((_, i) => String(i));

  return (
    <>
      {/* id={fullPath} keeps DndContext's auto-generated aria-describedby IDs
          stable between SSR and CSR. Without it dnd-kit's internal counter
          ticks differently in dev (StrictMode double-renders) and causes a
          hydration mismatch on every drag handle. */}
      <DndContext id={fullPath} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={rectSortingStrategy}>
          {items.map((child, i) => (
            <SortableCell key={i} id={String(i)} onRemove={() => remove(i)}>
              {child}
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
