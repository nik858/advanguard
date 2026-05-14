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

  // Non-edit: render items exactly as before, no extra DOM.
  if (!edit) {
    return <>{arr.map((_, i) => <Fragment key={i}>{children(i)}</Fragment>)}</>;
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
