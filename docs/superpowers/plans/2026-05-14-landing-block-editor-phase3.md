# Landing Page Block Editor — Phase 3: In-Place Media

> **For agentic workers:** Execute task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Change a photo/video directly on the landing — drag-and-drop a file onto it to replace, or use a "⋯" menu for Library / URL / Alt text — without going through the gallery page. Video files upload too.

**Architecture:** `MediaSlot` replaces `MediaSwapButton`: a corner button + a drag-active drop overlay. It resolves its path through `SectionContext` (Phase 1), reads/writes the draft via `useEditor`. `MediaLibraryPopover` lists uploaded blobs from `/api/media` inline. `useMediaUpload` wraps the Vercel Blob client upload (extracted from the old `UploadModal`). `UploadModal` + `MediaSwapButton` are deleted.

**Scope note:** Phase 3 delivers the *in-place media interaction* on every existing media field (Hero/Demo video, Stack image, video-testimonial video). It does **not** change the data model — no field becomes an array. "Varying the number of photos/videos" is delivered in Phase 4, where list editing (add/remove/reorder video testimonials, logos, etc.) is exactly where counts vary. Hero/Demo stay single-video by design — keeping it simple.

**Tech Stack:** `@vercel/blob/client` (already used), `/api/upload/sign` (existing), `/api/media` (existing).

---

## File Structure

**Created:**
- `app/_editor/useMediaUpload.ts` — hook: upload a `File` to Vercel Blob, returns its URL
- `app/_editor/MediaLibraryPopover.tsx` — inline grid of already-uploaded media
- `app/_editor/MediaSlot.tsx` — corner button + drop overlay + change popover (replaces `MediaSwapButton`)

**Modified:**
- `app/_sections/Hero.tsx`, `Demo.tsx`, `Stack.tsx`, `Testimonials.tsx` — `MediaSwapButton` → `MediaSlot`

**Deleted:**
- `app/_editor/MediaSwapButton.tsx`
- `app/_editor/UploadModal.tsx`

---

## Task 1: `useMediaUpload` hook

**Files:** Create `app/_editor/useMediaUpload.ts`

- [ ] **Step 1: Create the file**

```ts
"use client";
import { useState } from "react";
import { upload } from "@vercel/blob/client";

/** Uploads a File to Vercel Blob under media/ and returns its public URL (or null on failure). */
export function useMediaUpload() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadFile(f: File): Promise<string | null> {
    setBusy(true);
    setError(null);
    try {
      const blob = await upload(`media/${Date.now()}-${f.name}`, f, {
        access: "public",
        handleUploadUrl: "/api/upload/sign",
        contentType: f.type,
      });
      return blob.url;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  return { uploadFile, busy, error };
}
```

- [ ] **Step 2: Type-check** — `npx tsc --noEmit`, expect no errors.

- [ ] **Step 3: Commit**

```bash
git add app/_editor/useMediaUpload.ts
git commit -m "feat(editor): useMediaUpload hook"
```

---

## Task 2: `MediaLibraryPopover`

**Files:** Create `app/_editor/MediaLibraryPopover.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";
import { useEffect, useState } from "react";

type MediaItem = { pathname: string; url: string; size: number; uploadedAt: string };

export function MediaLibraryPopover({
  accept,
  onSelect,
}: {
  accept: "image" | "video";
  onSelect: (url: string) => void;
}) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/media")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((b) => setItems(Array.isArray(b.items) ? b.items : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const exts = accept === "image"
    ? [".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg"]
    : [".mp4", ".webm", ".mov", ".m4v"];
  const filtered = items.filter((it) =>
    exts.some((e) => it.pathname.toLowerCase().endsWith(e))
  );

  if (loading) {
    return <p style={{ fontSize: 12, color: "#71717a", margin: "8px 0" }}>Loading library…</p>;
  }
  if (filtered.length === 0) {
    return <p style={{ fontSize: 12, color: "#71717a", margin: "8px 0" }}>No {accept}s in the library yet.</p>;
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 6,
        maxHeight: 220,
        overflowY: "auto",
        marginTop: 8,
      }}
    >
      {filtered.map((it) => (
        <button
          key={it.url}
          type="button"
          onClick={() => onSelect(it.url)}
          title={it.pathname}
          style={{
            border: "1px solid #e7e7ea",
            borderRadius: 6,
            padding: 0,
            overflow: "hidden",
            cursor: "pointer",
            background: "#fafafa",
            aspectRatio: "16 / 10",
          }}
        >
          {accept === "image" ? (
            <img src={it.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <video src={it.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
          )}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Type-check** — `npx tsc --noEmit`, expect no errors.

- [ ] **Step 3: Commit**

```bash
git add app/_editor/MediaLibraryPopover.tsx
git commit -m "feat(editor): MediaLibraryPopover inline media picker"
```

---

## Task 3: `MediaSlot`

**Files:** Create `app/_editor/MediaSlot.tsx`

`MediaSlot` is a drop-in replacement for `MediaSwapButton` — same props (`path`, `accept`). It is rendered as a sibling inside the media's existing `position: relative` parent.

- [ ] **Step 1: Create the file**

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { useEditor } from "./EditorProvider";
import { useSectionPath } from "./SectionContext";
import { useMediaUpload } from "./useMediaUpload";
import { MediaLibraryPopover } from "./MediaLibraryPopover";
import { Icons } from "../_sections/_shared/Icons";

type View = "menu" | "library" | "url" | "alt";

export function MediaSlot({ path, accept }: { path: string; accept: "image" | "video" }) {
  const { setField, state } = useEditor();
  const fullPath = useSectionPath(path);
  const { uploadFile, busy, error } = useMediaUpload();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("menu");
  const [dragActive, setDragActive] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [altInput, setAltInput] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Window-level drag detection so the overlay only intercepts pointer
  // events while a file is actually being dragged.
  useEffect(() => {
    function onEnter(e: DragEvent) {
      if (e.dataTransfer?.types?.includes("Files")) setDragActive(true);
    }
    function onLeave(e: DragEvent) {
      if (e.relatedTarget === null) setDragActive(false);
    }
    function onDrop() { setDragActive(false); }
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    window.addEventListener("dragend", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("dragend", onDrop);
    };
  }, []);

  if (state.previewMode) return null;

  const current = fullPath.split(".").reduce<unknown>(
    (acc, k) => (acc as Record<string, unknown> | undefined)?.[k.match(/^\d+$/) ? Number(k) : (k as string)],
    state.draft as unknown,
  );

  function applyUrl(url: string) {
    if (typeof current === "object" && current !== null) {
      setField(fullPath, { ...(current as object), url });
    } else {
      setField(fullPath, url);
    }
    setOpen(false);
    setView("menu");
  }

  function applyAlt(alt: string) {
    const url = typeof current === "string" ? current : (current as { url?: string } | undefined)?.url ?? "";
    setField(fullPath, { url, alt });
    setOpen(false);
    setView("menu");
  }

  async function handleFile(f: File | undefined | null) {
    if (!f) return;
    const url = await uploadFile(f);
    if (url) applyUrl(url);
  }

  return (
    <>
      {/* Drop overlay — only intercepts events while a file drag is active */}
      <div
        onDragOver={(e) => { e.preventDefault(); }}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 9,
          pointerEvents: dragActive ? "auto" : "none",
          border: dragActive ? "2px dashed #1c7bfd" : "2px dashed transparent",
          background: dragActive ? "rgba(28,123,253,0.12)" : "transparent",
          display: "grid",
          placeItems: "center",
          fontFamily: "var(--adv-font, system-ui, sans-serif)",
          fontSize: 13,
          fontWeight: 600,
          color: "#1c7bfd",
          borderRadius: 8,
        }}
      >
        {dragActive ? `Drop to replace this ${accept}` : null}
      </div>

      {/* Corner button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); setView("menu"); }}
        aria-label="Change media"
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 10,
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          color: "#18181b",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 999,
          padding: "6px 12px",
          fontSize: 12,
          fontWeight: 500,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          fontFamily: "var(--adv-font, system-ui, sans-serif)",
        }}
      >
        <Icons.Pencil />
        Change
      </button>

      {/* Popover */}
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: 44,
            right: 10,
            zIndex: 11,
            width: 280,
            background: "#fff",
            border: "1px solid var(--adv-border, #e7e7ea)",
            borderRadius: 10,
            boxShadow: "0 12px 32px rgba(0,0,0,0.16)",
            padding: 10,
            fontFamily: "var(--adv-font, system-ui, sans-serif)",
            fontSize: 13,
            color: "#18181b",
          }}
        >
          {view === "menu" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <button type="button" style={popItem} onClick={() => fileRef.current?.click()}>
                Upload a file
              </button>
              <button type="button" style={popItem} onClick={() => setView("library")}>
                Choose from library
              </button>
              <button type="button" style={popItem} onClick={() => setView("url")}>
                Paste a URL
              </button>
              {accept === "image" && (
                <button type="button" style={popItem} onClick={() => {
                  setAltInput(typeof current === "object" && current !== null ? String((current as { alt?: string }).alt ?? "") : "");
                  setView("alt");
                }}>
                  Alt text
                </button>
              )}
              <p style={{ fontSize: 11, color: "#a1a1aa", margin: "6px 2px 0" }}>
                …or drag a {accept} file straight onto it.
              </p>
            </div>
          )}

          {view === "library" && (
            <div>
              <button type="button" style={popBack} onClick={() => setView("menu")}>‹ Back</button>
              <MediaLibraryPopover accept={accept} onSelect={applyUrl} />
            </div>
          )}

          {view === "url" && (
            <div>
              <button type="button" style={popBack} onClick={() => setView("menu")}>‹ Back</button>
              <input
                type="url"
                placeholder={accept === "video" ? "https://… (YouTube, Vimeo, .mp4)" : "https://…/image.jpg"}
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                style={popInput}
              />
              <button
                type="button"
                onClick={() => { if (urlInput.trim()) applyUrl(urlInput.trim()); }}
                style={popPrimary}
              >
                Use this URL
              </button>
            </div>
          )}

          {view === "alt" && (
            <div>
              <button type="button" style={popBack} onClick={() => setView("menu")}>‹ Back</button>
              <input
                type="text"
                placeholder="Describe the image (accessibility)"
                value={altInput}
                onChange={(e) => setAltInput(e.target.value)}
                style={popInput}
              />
              <button type="button" onClick={() => applyAlt(altInput.trim())} style={popPrimary}>
                Save alt text
              </button>
            </div>
          )}

          {busy && <p style={{ fontSize: 12, color: "#71717a", marginTop: 8 }}>Uploading…</p>}
          {error && <p style={{ fontSize: 12, color: "#c62828", marginTop: 8 }}>{error}</p>}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept={accept === "image" ? "image/*" : "video/mp4,video/webm,video/quicktime"}
        style={{ display: "none" }}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </>
  );
}

const popItem: React.CSSProperties = {
  textAlign: "left",
  background: "transparent",
  border: 0,
  padding: "7px 8px",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 13,
  fontFamily: "inherit",
  color: "#18181b",
};
const popBack: React.CSSProperties = {
  background: "transparent",
  border: 0,
  padding: "2px 0 6px",
  cursor: "pointer",
  fontSize: 12,
  color: "#71717a",
  fontFamily: "inherit",
};
const popInput: React.CSSProperties = {
  width: "100%",
  padding: 8,
  border: "1px solid #e7e7ea",
  borderRadius: 6,
  fontSize: 13,
  fontFamily: "inherit",
  boxSizing: "border-box",
};
const popPrimary: React.CSSProperties = {
  marginTop: 8,
  width: "100%",
  padding: "8px 12px",
  background: "#1c7bfd",
  color: "#fff",
  border: 0,
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
  fontFamily: "inherit",
};
```

- [ ] **Step 2: Type-check** — `npx tsc --noEmit`, expect no errors.

- [ ] **Step 3: Commit**

```bash
git add app/_editor/MediaSlot.tsx
git commit -m "feat(editor): MediaSlot — drag-drop replace + library/url/alt popover"
```

---

## Task 4: Swap `MediaSwapButton` → `MediaSlot` in section components

**Files:** Modify `Hero.tsx`, `Demo.tsx`, `Stack.tsx`, `Testimonials.tsx`

- [ ] **Step 1: `Hero.tsx`**

Change the import:
```ts
import { MediaSwapButton } from "../_editor/MediaSwapButton";
```
to:
```ts
import { MediaSlot } from "../_editor/MediaSlot";
```
Change the usage:
```tsx
{edit && <MediaSwapButton path="hero.videoUrl" accept="video" allowUrl />}
```
to:
```tsx
{edit && <MediaSlot path="hero.videoUrl" accept="video" />}
```

- [ ] **Step 2: `Demo.tsx`**

Import: `MediaSwapButton` → `MediaSlot` (same path change as Step 1).
Usage:
```tsx
{edit && <MediaSwapButton path="demo.videoUrl" accept="video" allowUrl />}
```
→
```tsx
{edit && <MediaSlot path="demo.videoUrl" accept="video" />}
```

- [ ] **Step 3: `Stack.tsx`**

Import: `MediaSwapButton` → `MediaSlot`.
Usage:
```tsx
{edit && <MediaSwapButton path="stack.bigStackImg" accept="image" />}
```
→
```tsx
{edit && <MediaSlot path="stack.bigStackImg" accept="image" />}
```

- [ ] **Step 4: `Testimonials.tsx`**

Import: `MediaSwapButton` → `MediaSlot`.
Usage:
```tsx
{edit && <MediaSwapButton path={`testimonials.items.${i}.videoUrl`} accept="video" allowUrl />}
```
→
```tsx
{edit && <MediaSlot path={`testimonials.items.${i}.videoUrl`} accept="video" />}
```

- [ ] **Step 5: Type-check + build** — `npx tsc --noEmit && npm run build`, expect both green.

- [ ] **Step 6: Commit**

```bash
git add app/_sections/Hero.tsx app/_sections/Demo.tsx app/_sections/Stack.tsx app/_sections/Testimonials.tsx
git commit -m "feat(sections): use MediaSlot for in-place media editing"
```

---

## Task 5: Delete `MediaSwapButton` and `UploadModal`

**Files:** Delete `app/_editor/MediaSwapButton.tsx`, `app/_editor/UploadModal.tsx`

- [ ] **Step 1: Confirm nothing imports them**

Run: `grep -rln "MediaSwapButton\|UploadModal" app/ --include="*.tsx" --include="*.ts"`
Expected: no output (the only references were the 4 section components, now changed).

- [ ] **Step 2: Delete the files**

```bash
git rm app/_editor/MediaSwapButton.tsx app/_editor/UploadModal.tsx
```

- [ ] **Step 3: Type-check + build** — `npx tsc --noEmit && npm run build`, expect both green.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(editor): remove MediaSwapButton and UploadModal (superseded by MediaSlot)"
```

---

## Task 6: Manual verification

- [ ] **Step 1: Dev server** — `npm run dev`, open the landing in edit mode.

- [ ] **Step 2: Verify**

  - Each media (Hero video, Demo video, Stack image, a video testimonial) shows the "✎ Change" button.
  - Click "Change" → popover: Upload a file / Choose from library / Paste a URL / (Alt text for the Stack image). Each path replaces the media and marks the draft dirty.
  - "Choose from library" lists already-uploaded media filtered by image/video; clicking one applies it.
  - Drag an image file from the desktop over the page → the targeted media shows a dashed highlight "Drop to replace"; dropping it uploads and replaces.
  - Drag a video file onto the Hero/Demo video → uploads and sets the video URL.
  - Public page (non-edit) shows no Change buttons and renders the media normally.

- [ ] **Step 3: Report** any discrepancy; otherwise Phase 3 is complete.
