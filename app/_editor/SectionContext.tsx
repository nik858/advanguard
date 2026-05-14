"use client";
import { createContext, useContext } from "react";

export type SectionContextValue = { basePath: string };

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
