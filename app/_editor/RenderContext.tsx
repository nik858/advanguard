"use client";
import { createContext, useContext, type ReactNode } from "react";

type RenderContextValue = {
  /** Stable keys (e.g. "<sectionId>:hero.videoLabel") to omit from the render. */
  hiddenFields: string[];
  /** Whether we're rendering inside the inline editor. */
  edit: boolean;
};

const RenderContext = createContext<RenderContextValue>({ hiddenFields: [], edit: false });

export function RenderContextProvider({
  value,
  children,
}: {
  value: RenderContextValue;
  children: ReactNode;
}) {
  return <RenderContext.Provider value={value}>{children}</RenderContext.Provider>;
}

export function useRenderContext(): RenderContextValue {
  return useContext(RenderContext);
}
