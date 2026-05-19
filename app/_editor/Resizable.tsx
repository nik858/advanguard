"use client";
import { type ReactNode } from "react";
import { useEditor } from "./EditorProvider";
import { useStableFieldKey } from "./SectionContext";
import { useRenderContext, type ImageSize } from "./RenderContext";
import styles from "./styles.module.css";

const SIZE_STYLES: Record<ImageSize, React.CSSProperties> = {
  default: {},
  bigger: { maxWidth: "1200px", width: "100%", marginLeft: "auto", marginRight: "auto", display: "block" },
  full: { maxWidth: "none", width: "100%", display: "block" },
};

const SIZE_LABEL: Record<ImageSize, string> = {
  default: "Default",
  bigger: "Bigger",
  full: "Full width",
};

const SIZE_ORDER: ImageSize[] = ["default", "bigger", "full"];

type ResizableProps = {
  /** Section-local path used as a stable key in content.imageSizes. */
  path: string;
  /** The image/video block to render. */
  children: ReactNode;
  /** Optional className applied to the wrapper. */
  className?: string;
  /** Label used in the size picker tooltip. */
  label?: string;
};

/**
 * Wraps a visual block (image, video, embed) to expose 3 size choices —
 * Default / Bigger / Full width — in edit mode. The chosen size is stored in
 * `content.imageSizes[stableKey]` and applied at render time as inline
 * max-width styles so it survives reload and works on the published page.
 *
 * In production the wrapper is invisible: it applies the size style and
 * renders the children with no extra chrome.
 */
export function Resizable({ path, children, className, label }: ResizableProps) {
  const { imageSizes, edit } = useRenderContext();
  const key = useStableFieldKey(path);
  const size: ImageSize = imageSizes[key] ?? "default";
  const sizeStyle = SIZE_STYLES[size];

  if (!edit) {
    return (
      <div className={`${className ?? ""} ${styles.resizable}`.trim()} data-size={size} style={sizeStyle}>
        {children}
      </div>
    );
  }
  return (
    <ResizableEditing className={className} sizeStyle={sizeStyle} stableKey={key} currentSize={size} label={label} path={path}>
      {children}
    </ResizableEditing>
  );
}

function ResizableEditing({
  children,
  className,
  sizeStyle,
  stableKey,
  currentSize,
  label,
  path,
}: {
  children: ReactNode;
  className?: string;
  sizeStyle: React.CSSProperties;
  stableKey: string;
  currentSize: ImageSize;
  label?: string;
  path: string;
}) {
  const { setImageSize } = useEditor();
  // Hover visibility is purely CSS (`:hover` on the wrapper). This keeps the
  // toolbar visible when the cursor moves onto it — a JS `mouseleave` would
  // hide the toolbar the moment the cursor crosses its bounding box.
  return (
    <div
      className={`${className ?? ""} ${styles.resizable}`.trim()}
      data-size={currentSize}
      style={{ ...sizeStyle, position: "relative" }}
    >
      {children}
      <div
        className={styles.resizableToolbar}
        onMouseDown={(e) => e.stopPropagation()}
        title={`Size of ${label ?? path}`}
      >
        {SIZE_ORDER.map((s) => (
          <button
            key={s}
            type="button"
            className={styles.resizableBtn}
            data-active={currentSize === s}
            onClick={(e) => {
              e.stopPropagation();
              setImageSize(stableKey, s);
            }}
          >
            {SIZE_LABEL[s]}
          </button>
        ))}
      </div>
    </div>
  );
}
