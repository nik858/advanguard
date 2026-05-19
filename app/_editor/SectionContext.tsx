"use client";
import { createContext, useContext } from "react";

export type SectionContextValue = {
  basePath: string;
  /** Stable section id, used to key hiddenFields entries through reorders. */
  sectionId?: string;
};

const SectionContext = createContext<SectionContextValue | null>(null);

export const SectionContextProvider = SectionContext.Provider;

/**
 * Resolves a section-relative editor path to a draft-absolute path.
 * Inside a section: "h2" -> "sections.4.data.h2".
 * Outside a section (Header/Footer): returned unchanged.
 */
export function useSectionPath(localPath: string): string {
  const ctx = useContext(SectionContext);
  return ctx ? `${ctx.basePath}.${localPath}` : localPath;
}

/**
 * Returns a stable, reorder-resilient key for the given local path. Inside a
 * section, uses the section id so the key survives reordering. Outside (Header,
 * Footer), the local path is the key.
 */
export function useStableFieldKey(localPath: string): string {
  const ctx = useContext(SectionContext);
  return ctx?.sectionId ? `${ctx.sectionId}:${localPath}` : localPath;
}
