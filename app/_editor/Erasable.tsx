"use client";
import { useState, type ReactNode, type ElementType } from "react";
import { useEditor } from "./EditorProvider";
import { useStableFieldKey } from "./SectionContext";
import { useRenderContext } from "./RenderContext";
import styles from "./styles.module.css";

type ErasableProps = {
  /** Section-local path to hide, e.g. "hero.videoLabel" or "headline.eyebrow". */
  path: string;
  /** The block rendered when the field is visible. */
  children: ReactNode;
  /** Wrapper element in edit mode. Default <div>. */
  as?: ElementType;
  /** Optional className applied to the edit-mode wrapper. */
  className?: string;
  /** Human-readable label used in the X tooltip. */
  label?: string;
  /** When true, places the X further inside the wrapper (use for media tiles). */
  outside?: boolean;
};

/**
 * Wraps a block (text / image / video) so the operator can delete it from the
 * page in edit mode. When the field's stable key is in the global
 * `hiddenFields`, the block disappears — the layout below reflows. Cmd+Z
 * restores it.
 *
 * In production, this component renders the children with NO extra DOM —
 * we don't want the editor chrome leaking into the live page's layout.
 */
export function Erasable(props: ErasableProps) {
  const { path, children } = props;
  const { hiddenFields, edit } = useRenderContext();
  const key = useStableFieldKey(path);
  if (hiddenFields.includes(key)) return null;
  if (!edit) return <>{children}</>;
  return <ErasableEditing {...props} stableKey={key} />;
}

function ErasableEditing({
  stableKey,
  children,
  as: Tag = "div",
  className,
  label,
  path,
  outside = false,
}: ErasableProps & { stableKey: string }) {
  const { setFieldHidden } = useEditor();
  const [hover, setHover] = useState(false);
  return (
    <Tag
      className={`${className ?? ""} ${styles.erasable}`.trim()}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {children}
      {hover && (
        <button
          type="button"
          className={outside ? styles.erasableDeleteOutside : styles.erasableDelete}
          title={`Delete ${label ?? path.split(".").slice(-1)[0]} (Cmd+Z to undo)`}
          aria-label={`Delete ${label ?? path}`}
          onMouseDown={(e) => {
            // Prevent text-selection / focus stealing when X is clicked over text.
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
            setFieldHidden(stableKey, true);
          }}
        >
          ×
        </button>
      )}
    </Tag>
  );
}
