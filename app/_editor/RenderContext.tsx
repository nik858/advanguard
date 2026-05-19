"use client";
import { createContext, useContext, type ReactNode } from "react";

export type ImageSize = "default" | "bigger" | "full";

type RenderContextValue = {
  /** Stable keys (e.g. "<sectionId>:hero.videoLabel") to omit from the render. */
  hiddenFields: string[];
  /** Per-image size overrides keyed by the same stable-key scheme. */
  imageSizes: Record<string, ImageSize>;
  /** Whether we're rendering inside the inline editor. */
  edit: boolean;
};

const RenderContext = createContext<RenderContextValue>({
  hiddenFields: [],
  imageSizes: {},
  edit: false,
});

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
