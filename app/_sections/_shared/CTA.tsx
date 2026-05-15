"use client";
import type { ReactNode } from "react";
import { Icons } from "./Icons";

export function CTA({
  tag,
  label,
  compact = false,
  ariaLabel,
  onClick,
  type = "button",
}: {
  tag?: ReactNode;
  label: ReactNode;
  compact?: boolean;
  ariaLabel?: string;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  const ariaFallback = typeof label === "string" ? label : undefined;
  return (
    <button
      className={`ac-cta ${compact ? "ac-cta--compact" : ""}`}
      type={type}
      onClick={onClick}
      aria-label={ariaLabel || ariaFallback}
    >
      {tag && <span className="ac-cta__tag">{tag}</span>}
      <span className="ac-cta__label">{label}<span className="ac-cta__arrow"><Icons.ArrowRight/></span></span>
    </button>
  );
}
