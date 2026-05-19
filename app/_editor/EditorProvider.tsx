"use client";
import { createContext, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import type { Content, SectionType } from "@/types/content";
import { migrateContent, genSectionId, createSection } from "@/types/content";
import type { EditorState, EditorAction } from "./types";

const STORAGE_KEY = "adv:draft:v1";
const HISTORY_LIMIT = 50;

function setByPath(obj: unknown, path: string, value: unknown): unknown {
  if (!path) return value;
  const parts = path.split(".").map((p) => p.match(/^\d+$/) ? Number(p) : p);
  const root: any = Array.isArray(obj) ? [...obj] : { ...(obj as object) };
  let cur: any = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    const next = cur[k];
    cur[k] = Array.isArray(next) ? [...next] : { ...next };
    cur = cur[k];
  }
  cur[parts[parts.length - 1]] = value;
  return root;
}

function pushHistory(state: EditorState): Pick<EditorState, "history" | "future"> {
  const next = [...state.history, state.draft];
  return {
    history: next.length > HISTORY_LIMIT ? next.slice(next.length - HISTORY_LIMIT) : next,
    future: [],
  };
}

function withDraft(state: EditorState, draft: Content, opts?: { recordHistory?: boolean }): EditorState {
  const dirty = JSON.stringify(draft) !== JSON.stringify(state.baseline);
  const historyPatch = opts?.recordHistory === false ? {} : pushHistory(state);
  return {
    ...state,
    ...historyPatch,
    draft,
    dirty,
    lastSaveAt: dirty ? null : state.lastSaveAt,
  };
}

function reducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "set": {
      const next = setByPath(state.draft, action.path, action.value) as Content;
      return withDraft(state, next);
    }
    case "setFieldHidden": {
      const current = new Set(state.draft.hiddenFields ?? []);
      if (action.hidden) current.add(action.path);
      else current.delete(action.path);
      const next = { ...state.draft, hiddenFields: [...current] };
      return withDraft(state, next);
    }
    case "reset":
      // Reset clears history — the draft just snapped back to baseline.
      return { ...state, draft: state.baseline, dirty: false, history: [], future: [] };
    case "setDraft": {
      // setDraft is used for loading from storage/server — do NOT push history.
      const dirty = JSON.stringify(action.draft) !== JSON.stringify(state.baseline);
      return { ...state, draft: action.draft, dirty };
    }
    case "savedAt":
      return { ...state, lastSaveAt: action.at };
    case "togglePreview":
      return { ...state, previewMode: !state.previewMode };
    case "reorderSections": {
      const byId = new Map(state.draft.sections.map((s) => [s.id, s]));
      const sections = action.order
        .map((id) => byId.get(id))
        .filter((s): s is NonNullable<typeof s> => Boolean(s));
      return withDraft(state, { ...state.draft, sections });
    }
    case "setSectionHidden": {
      const sections = state.draft.sections.map((s) =>
        s.id === action.id ? { ...s, hidden: action.hidden } : s
      );
      return withDraft(state, { ...state.draft, sections });
    }
    case "addSection":
      return withDraft(state, { ...state.draft, sections: [...state.draft.sections, action.section] });
    case "duplicateSection": {
      const idx = state.draft.sections.findIndex((s) => s.id === action.id);
      if (idx < 0) return state;
      const orig = state.draft.sections[idx];
      const copy = { ...structuredClone(orig), id: genSectionId() };
      const sections = [...state.draft.sections];
      sections.splice(idx + 1, 0, copy);
      return withDraft(state, { ...state.draft, sections });
    }
    case "removeSection": {
      const sections = state.draft.sections.filter((s) => s.id !== action.id);
      return withDraft(state, { ...state.draft, sections });
    }
    case "setSectionStyle": {
      const sections = state.draft.sections.map((s) =>
        s.id === action.id ? { ...s, style: action.style } : s
      );
      return withDraft(state, { ...state.draft, sections });
    }
    case "undo": {
      if (state.history.length === 0) return state;
      const prev = state.history[state.history.length - 1];
      const history = state.history.slice(0, -1);
      const future = [state.draft, ...state.future].slice(0, HISTORY_LIMIT);
      const dirty = JSON.stringify(prev) !== JSON.stringify(state.baseline);
      return { ...state, draft: prev, history, future, dirty, lastSaveAt: dirty ? null : state.lastSaveAt };
    }
    case "redo": {
      if (state.future.length === 0) return state;
      const [next, ...rest] = state.future;
      const history = [...state.history, state.draft].slice(-HISTORY_LIMIT);
      const dirty = JSON.stringify(next) !== JSON.stringify(state.baseline);
      return { ...state, draft: next, history, future: rest, dirty, lastSaveAt: dirty ? null : state.lastSaveAt };
    }
  }
}

type EditorContextValue = {
  state: EditorState;
  setField: (path: string, value: unknown) => void;
  setFieldHidden: (path: string, hidden: boolean) => void;
  isFieldHidden: (path: string) => boolean;
  resetDraft: () => void;
  togglePreview: () => void;
  publish: () => Promise<{ ok: true; commit_sha?: string } | { ok: false; error: string }>;
  reorderSections: (order: string[]) => void;
  setSectionHidden: (id: string, hidden: boolean) => void;
  addSection: (type: SectionType) => void;
  duplicateSection: (id: string) => void;
  removeSection: (id: string) => void;
  setSectionStyle: (id: string, style: { pt?: number; pb?: number }) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

const Ctx = createContext<EditorContextValue | null>(null);
export const useEditor = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useEditor outside EditorProvider");
  return v;
};

export function EditorProvider({ initial, children }: { initial: Content; children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    draft: initial,
    baseline: initial,
    dirty: false,
    publishing: false,
    lastSaveAt: null,
    previewMode: false,
    history: [],
    future: [],
  });

  // Load draft from localStorage on mount, then merge server-side draft if exists
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          dispatch({ type: "setDraft", draft: migrateContent(parsed) });
        }
      }
    } catch { /* ignore corrupt/incompatible local draft */ }
    fetch("/api/draft").then(async (r) => {
      if (!r.ok) return;
      const body = await r.json();
      if (body?.draft) {
        try {
          dispatch({ type: "setDraft", draft: migrateContent(body.draft) });
        } catch { /* ignore incompatible server draft */ }
      }
    }).catch(() => {});
  }, []);

  // Save to localStorage on every change
  useEffect(() => {
    if (state.dirty) localStorage.setItem(STORAGE_KEY, JSON.stringify(state.draft));
    else localStorage.removeItem(STORAGE_KEY);
  }, [state.draft, state.dirty]);

  // Debounced save to server (Vercel Blob)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!state.dirty) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch("/api/draft", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ draft: state.draft }),
      })
        .then((r) => { if (r.ok) dispatch({ type: "savedAt", at: Date.now() }); })
        .catch(() => {});
    }, 5000);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [state.draft, state.dirty]);

  // Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z for undo/redo. Skip when the focused
  // element is a real text input — the browser's native undo handles those.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta || e.key.toLowerCase() !== "z") return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName.toLowerCase();
      const inField = tag === "input" || tag === "textarea" || target?.isContentEditable;
      if (inField) return;
      e.preventDefault();
      dispatch({ type: e.shiftKey ? "redo" : "undo" });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = useMemo<EditorContextValue>(() => ({
    state,
    setField: (path, value) => dispatch({ type: "set", path, value }),
    setFieldHidden: (path, hidden) => dispatch({ type: "setFieldHidden", path, hidden }),
    isFieldHidden: (path) => (state.draft.hiddenFields ?? []).includes(path),
    resetDraft: () => {
      dispatch({ type: "reset" });
      localStorage.removeItem(STORAGE_KEY);
      fetch("/api/draft", { method: "DELETE" }).catch(() => {});
    },
    togglePreview: () => dispatch({ type: "togglePreview" }),
    publish: async () => {
      const res = await fetch("/api/publish", { method: "POST" });
      if (res.ok) {
        const body = await res.json();
        localStorage.removeItem(STORAGE_KEY);
        return { ok: true, commit_sha: body.commit_sha };
      }
      const err = await res.json().catch(() => ({ error: "Erreur inconnue" }));
      return { ok: false, error: err.error || "Erreur" };
    },
    reorderSections: (order) => dispatch({ type: "reorderSections", order }),
    setSectionHidden: (id, hidden) => dispatch({ type: "setSectionHidden", id, hidden }),
    addSection: (type) => dispatch({ type: "addSection", section: createSection(type) }),
    duplicateSection: (id) => dispatch({ type: "duplicateSection", id }),
    removeSection: (id) => dispatch({ type: "removeSection", id }),
    setSectionStyle: (id, style) => dispatch({ type: "setSectionStyle", id, style }),
    undo: () => dispatch({ type: "undo" }),
    redo: () => dispatch({ type: "redo" }),
    canUndo: state.history.length > 0,
    canRedo: state.future.length > 0,
  }), [state]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
