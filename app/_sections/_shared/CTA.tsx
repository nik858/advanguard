"use client";
import { Icons } from "./Icons";

export function CTA({ tag, label, compact = false, ariaLabel, onClick }: {
  tag?: string; label: string; compact?: boolean; ariaLabel?: string; onClick?: () => void;
}) {
  return (
    <button className={`ac-cta ${compact ? "ac-cta--compact" : ""}`} type="button" onClick={onClick} aria-label={ariaLabel || label}>
      {tag && <span className="ac-cta__tag">{tag}</span>}
      <span className="ac-cta__label">{label}<span className="ac-cta__arrow"><Icons.ArrowRight/></span></span>
    </button>
  );
}
