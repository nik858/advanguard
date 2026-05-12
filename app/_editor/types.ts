import type { Content } from "@/types/content";

export type EditorState = {
  draft: Content;
  baseline: Content;
  dirty: boolean;
  publishing: boolean;
  lastSaveAt: number | null;
};

export type EditorAction =
  | { type: "set"; path: string; value: unknown }
  | { type: "reset" }
  | { type: "setDraft"; draft: Content };
