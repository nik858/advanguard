import type { ReactNode } from "react";

export function Book({
  size = "lg",
  title,
  quoteLines,
  titleParts,
}: {
  size?: "lg" | "sm";
  /** Optional pre-wrapped node (e.g., <EditRich>). If provided, replaces the default split-on-space rendering. */
  title?: ReactNode;
  /** Optional pre-wrapped quote line nodes. */
  quoteLines?: ReactNode[];
  /** Used when `title` is a plain string in legacy callers — splits on whitespace into 2 words for the stylized title. */
  titleParts?: [ReactNode, ReactNode];
}) {
  const DEFAULT_TITLE_W1 = "Automatic";
  const DEFAULT_TITLE_W2 = "Clients";
  const DEFAULT_QUOTE_LINES = [
    "Copy & paste automated process",
    "that allows you to acquire",
    "customers for free",
  ];
  return (
    <div className={`ac-book ${size === "sm" ? "ac-book--sm" : ""}`}>
      <div className="ac-book__title">
        {title ?? (titleParts ? <>{titleParts[0]}<br/>{titleParts[1]}</> : <>{DEFAULT_TITLE_W1}<br/>{DEFAULT_TITLE_W2}</>)}
      </div>
      <div className="ac-book__placeholder">
        <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M21 5v14H3V5h18m0-2H3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2m-5 5.5a1.5 1.5 0 1 0 1.5 1.5 1.5 1.5 0 0 0-1.5-1.5M5 17l3.5-4.5 2.5 3 3.5-4.5L19 17H5"/></svg>
      </div>
      <div className="ac-book__quote">
        {(quoteLines ?? DEFAULT_QUOTE_LINES.map((l) => l)).map((l, i) => <span key={i}>{l}</span>)}
      </div>
      <div className="ac-book__binding"></div>
    </div>
  );
}
