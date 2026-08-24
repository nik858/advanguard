"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { PaidVariant } from "@/lib/landing/variants";

export type ImageSize = "default" | "bigger" | "full";

type RenderContextValue = {
  /** Stable keys (e.g. "<sectionId>:hero.videoLabel") to omit from the render. */
  hiddenFields: string[];
  /** Per-image size overrides keyed by the same stable-key scheme. */
  imageSizes: Record<string, ImageSize>;
  /** Whether we're rendering inside the inline editor. */
  edit: boolean;
  /** Which paid landing page this render belongs to — the order form posts it
      to /api/premium/checkout so the buyer comes back to the right thank-you
      page and the lead is attributed to the right funnel. Absent on the free
      page, where no Checkout session is ever opened. */
  checkoutVariant?: PaidVariant;
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
