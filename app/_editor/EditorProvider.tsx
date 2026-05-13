"use client";
import { createContext, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import type { Content } from "@/types/content";
import type { EditorState, EditorAction } from "./types";

const STORAGE_KEY = "adv:draft:v1";

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

function reducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "set": {
      const next = setByPath(state.draft, action.path, action.value) as Content;
      const dirty = JSON.stringify(next) !== JSON.stringify(state.baseline);
      return {
        ...state,
        draft: next,
        dirty,
        // A new edit invalidates the saved-at indicator while dirty.
        // When edit brings us back to baseline (dirty=false), keep prior lastSaveAt.
        lastSaveAt: dirty ? null : state.lastSaveAt,
      };
    }
    case "reset":
      return { ...state, draft: state.baseline, dirty: false };
    case "setDraft": {
      const dirty = JSON.stringify(action.draft) !== JSON.stringify(state.baseline);
      return { ...state, draft: action.draft, dirty };
    }
    case "savedAt":
      return { ...state, lastSaveAt: action.at };
    case "togglePreview":
      return { ...state, previewMode: !state.previewMode };
  }
}

type EditorContextValue = {
  state: EditorState;
  setField: (path: string, value: unknown) => void;
  resetDraft: () => void;
  togglePreview: () => void;
  publish: () => Promise<{ ok: true; commit_sha?: string } | { ok: false; error: string }>;
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
  });

  // Load draft from localStorage on mount, then merge server-side draft if exists
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") dispatch({ type: "setDraft", draft: parsed });
      }
    } catch { /* ignore */ }
    fetch("/api/draft").then(async (r) => {
      if (!r.ok) return;
      const body = await r.json();
      if (body?.draft) dispatch({ type: "setDraft", draft: body.draft });
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

  const value = useMemo<EditorContextValue>(() => ({
    state,
    setField: (path, value) => dispatch({ type: "set", path, value }),
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
  }), [state]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
