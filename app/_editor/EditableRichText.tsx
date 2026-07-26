"use client";
import { useEffect, useRef, useState, type ElementType } from "react";
import { useEditor } from "./EditorProvider";
import { useSectionPath } from "./SectionContext";
import { RichTextToolbar } from "./RichTextToolbar";
import { useMediaUpload } from "./useMediaUpload";
import styles from "./styles.module.css";

// Invisible marker dropped at the caret when the operator picks "image" in the
// toolbar. It is saved into the draft immediately (not on blur — browsers do
// not reliably blur a contenteditable when a file dialog opens), so the upload
// callback can swap it for the final <img> whenever it completes. Publish-time
// sanitization strips any stray marker left by a cancelled dialog.
const IMG_MARKER = '<span data-adv-img-slot="1">​</span>';
const IMG_MARKER_RE = /<span[^>]*data-adv-img-slot[^>]*>[\s\S]*?<\/span>/;

/**
 * Opens a file picker and resolves with the chosen file (null if cancelled).
 *
 * The input is created outside React on purpose: the editor re-renders while
 * the dialog is open (autosave, toolbar state), and a React-owned hidden input
 * can be unmounted in the meantime — its change event would then never reach
 * any handler and the upload would silently never start.
 */
function pickImageFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.cssText = "position:fixed;left:-9999px;width:1px;height:1px";
    let settled = false;
    const finish = (f: File | null) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("focus", onWindowFocus);
      input.remove();
      resolve(f);
    };
    // Fallback for browsers without the `cancel` event: once the window regains
    // focus, a moment later, an empty file list means the dialog was dismissed.
    function onWindowFocus() {
      setTimeout(() => { if (!input.files?.length) finish(null); }, 800);
    }
    input.addEventListener("change", () => finish(input.files?.[0] ?? null));
    input.addEventListener("cancel", () => finish(null));
    window.addEventListener("focus", onWindowFocus);
    document.body.appendChild(input);
    input.click();
  });
}

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
  const { uploadFile, busy: uploading, error: uploadError } = useMediaUpload();
  // Upload errors are surfaced as a transient badge rather than a sticky one.
  const [errorShown, setErrorShown] = useState<string | null>(null);
  useEffect(() => {
    if (!uploadError) return;
    setErrorShown(uploadError);
    const t = setTimeout(() => setErrorShown(null), 6000);
    return () => clearTimeout(t);
  }, [uploadError]);

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

  function stripMarker() {
    const cur = valueRef.current;
    if (IMG_MARKER_RE.test(cur)) setField(fullPath, cur.replace(IMG_MARKER_RE, ""));
  }

  /**
   * Toolbar "image" action: mark the caret position, persist it right away,
   * then upload the chosen file and swap the marker for the <img>.
   */
  async function onRequestImage() {
    try { document.execCommand("insertHTML", false, IMG_MARKER); } catch { /* noop */ }
    const marked = ref.current?.innerHTML ?? "";
    if (marked && IMG_MARKER_RE.test(marked)) setField(fullPath, marked);

    const file = await pickImageFile();
    if (!file) { stripMarker(); return; }

    const url = await uploadFile(file);
    if (!url) { stripMarker(); return; }

    const cur = valueRef.current;
    const img = `<img src="${url.replace(/"/g, "&quot;")}" alt="">`;
    // No marker (execCommand refused, or the caret was lost): append instead of
    // dropping the image the operator just waited for.
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

  const uploadingBadge = (uploading || errorShown) ? (
    <span
      role="status"
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 300,
        background: errorShown ? "#c62828" : "#18181b",
        color: "#fff",
        padding: "8px 14px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 600,
        fontFamily: "var(--adv-font, system-ui, sans-serif)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.24)",
      }}
    >
      {errorShown ? `Image upload failed: ${errorShown}` : "Uploading image…"}
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
      {uploadingBadge}
    </>
  );
}

