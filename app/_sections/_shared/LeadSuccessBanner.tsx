"use client";
import type { ReactNode } from "react";

// The green "lead landed" pill. The order card mounts its own editable copy of
// this markup twice (--top / --inline, swapped by viewport). This standalone
// version is what replaces the scroll-to-form CTA buttons elsewhere on the page,
// so it stays visible at every breakpoint.
export function LeadSuccessBanner({ children }: { children: ReactNode }) {
  return (
    <div className="ac-order__success ac-order__success--standalone" role="status" aria-live="polite">
      <span className="ac-order__success-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 13l4 4L19 7" />
        </svg>
      </span>
      <span className="ac-order__success-text">{children}</span>
    </div>
  );
}
