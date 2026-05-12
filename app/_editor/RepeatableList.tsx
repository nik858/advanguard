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
