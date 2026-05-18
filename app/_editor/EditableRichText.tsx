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
