"use client";
import { useEffect, useRef, useState, type ElementType } from "react";
import { useEditor } from "./EditorProvider";
import { useSectionPath } from "./SectionContext";
import { RichTextToolbar } from "./RichTextToolbar";
import { useMediaUpload } from "./useMediaUpload";
import styles from "./styles.module.css";

// Invisible marker dropped at the caret when the operator picks "image" in the
// toolbar: the file dialog blurs the contenteditable (which saves the field),
// so the upload callback later swaps this marker for the final <img> tag
// directly in the saved value. Publish-time sanitization strips any stray
// marker left by a cancelled dialog.
const IMG_MARKER = '<span data-adv-img-slot="1">​</span>';
const IMG_MARKER_RE = /<span[^>]*data-adv-img-slot[^>]*>[\s\S]*?<\/span>/;

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
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [editing, setEditing] = useState(false);
  const [toolbarRange, setToolbarRange] = useState<Range | null>(null);
  const { uploadFile, busy: uploading } = useMediaUpload();

  const value: string = fullPath.split(".").reduce<any>(
    (acc, k) => acc?.[k.match(/^\d+$/) ? Number(k) : k],
    state.draft,
  ) ?? "";
  // Fresh value for async callbacks (the upload completes long after the blur
  // that saved the marker into the draft).
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (!editing || !ref.current) return;
    ref.current.innerHTML = value;
    ref.current.focus();
    // Make execCommand emit semantic <b>/<i>/<u>/<font color> instead of
    // <span style="font-weight:bold"> — semantic tags normalize cleanly
    // in sanitizeRichText.
    try { document.execCommand("styleWithCSS", false, "false"); } catch { /* noop */ }
  }, [editing, value]);

  useEffect(() => {
    if (!editing) { setToolbarRange(null); return; }
    function onSelectionChange() {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) { setToolbarRange(null); return; }
      // Collapsed caret: keep the toolbar up for multiline fields — it shows
      // the "insert image at cursor" action there.
      if (sel.isCollapsed && !multiline) { setToolbarRange(null); return; }
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
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function onMutated() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    setToolbarRange(sel.getRangeAt(0));
  }

  // Toolbar "image" action: drop the invisible marker at the caret, then open
  // the file picker. The dialog blurs the editable, which saves the field
  // (marker included); handleImageFile swaps the marker for the uploaded URL.
  function onRequestImage() {
    try { document.execCommand("insertHTML", false, IMG_MARKER); } catch { /* noop */ }
    fileRef.current?.click();
  }

  async function handleImageFile(f: File | undefined | null) {
    if (!f) return;
    const url = await uploadFile(f);
    const cur = valueRef.current;
    if (!url) {
      // Upload failed — drop the marker so no artifact lingers in the text.
      if (IMG_MARKER_RE.test(cur)) setField(fullPath, cur.replace(IMG_MARKER_RE, ""));
      return;
    }
    const img = `<img src="${url}" alt="">`;
    setField(fullPath, IMG_MARKER_RE.test(cur) ? cur.replace(IMG_MARKER_RE, img) : cur + img);
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

  const imageInput = multiline ? (
    <input
      ref={fileRef}
      type="file"
      accept="image/*"
      style={{ display: "none" }}
      onChange={(e) => { handleImageFile(e.target.files?.[0]); e.target.value = ""; }}
    />
  ) : null;

  const uploadingBadge = uploading ? (
    <span
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 300,
        background: "#18181b",
        color: "#fff",
        padding: "8px 14px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 600,
        fontFamily: "var(--adv-font, system-ui, sans-serif)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.24)",
      }}
    >
      Uploading image…
    </span>
  ) : null;

  if (!editing) {
    return (
      <>
        <Tag
          className={`${className} ${styles.editable}`}
          tabIndex={0}
          onClick={() => setEditing(true)}
          style={{ whiteSpace: multiline ? "pre-line" : undefined }}
          dangerouslySetInnerHTML={{ __html: value || (typeof children === "string" ? children : "") }}
        />
        {imageInput}
        {uploadingBadge}
      </>
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
        <RichTextToolbar
          range={toolbarRange}
          host={ref.current}
          onMutated={onMutated}
          allowImage={multiline}
          onRequestImage={onRequestImage}
        />
      )}
      {imageInput}
      {uploadingBadge}
    </>
  );
}

