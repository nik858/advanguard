import type { Content, Section } from "@/types/content";

export type EditorState = {
  draft: Content;
  baseline: Content;
  dirty: boolean;
  publishing: boolean;
  lastSaveAt: number | null;
  previewMode: boolean;
};

export type EditorAction =
  | { type: "set"; path: string; value: unknown }
  | { type: "reset" }
  | { type: "setDraft"; draft: Content }
  | { type: "savedAt"; at: number }
  | { type: "togglePreview" }
  | { type: "reorderSections"; order: string[] }
  | { type: "setSectionHidden"; id: string; hidden: boolean }
  | { type: "addSection"; section: Section }
  | { type: "duplicateSection"; id: string }
  | { type: "removeSection"; id: string };
