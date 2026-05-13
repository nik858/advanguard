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

  // In preview mode, render plain text without editor affordance
  if (state.previewMode) {
    return <Tag className={className} style={{ whiteSpace: multiline ? "pre-line" : undefined }}>{children ?? value}</Tag>;
  }

  return (
    <Tag
      ref={ref}
      className={`${className} ${styles.editable}`}
      data-editing={editing ? "true" : "false"}
      data-multiline={multiline ? "true" : "false"}
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
