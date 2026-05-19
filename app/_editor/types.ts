import type { Content, Section } from "@/types/content";

export type EditorState = {
  draft: Content;
  baseline: Content;
  dirty: boolean;
  publishing: boolean;
  lastSaveAt: number | null;
  previewMode: boolean;
  /** Past drafts available for undo. The current draft is NOT in this stack. */
  history: Content[];
  /** Drafts available for redo (cleared on any new mutating action). */
  future: Content[];
};

export type EditorAction =
  | { type: "set"; path: string; value: unknown }
  | { type: "setFieldHidden"; path: string; hidden: boolean }
  | { type: "setImageSize"; path: string; size: "default" | "bigger" | "full" }
  | { type: "reset" }
  | { type: "setDraft"; draft: Content }
  | { type: "savedAt"; at: number }
  | { type: "togglePreview" }
  | { type: "reorderSections"; order: string[] }
  | { type: "setSectionHidden"; id: string; hidden: boolean }
  | { type: "addSection"; section: Section }
  | { type: "duplicateSection"; id: string }
  | { type: "removeSection"; id: string }
  | { type: "setSectionStyle"; id: string; style: { pt?: number; pb?: number } }
  | { type: "undo" }
  | { type: "redo" };
