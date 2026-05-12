export function Book({ size = "lg", title = "Automatic Clients", quoteLines = ["Copy & paste automated process", "that allows you to acquire", "customers for free"] }: {
  size?: "lg" | "sm"; title?: string; quoteLines?: string[];
}) {
  const [w1, w2] = title.split(/\s/);
  return (
    <div className={`ac-book ${size === "sm" ? "ac-book--sm" : ""}`} aria-hidden="true">
      <div className="ac-book__title">{w1}<br/>{w2}</div>
      <div className="ac-book__bolt">⚡</div>
      <div className="ac-book__placeholder">
        <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M21 5v14H3V5h18m0-2H3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2m-5 5.5a1.5 1.5 0 1 0 1.5 1.5 1.5 1.5 0 0 0-1.5-1.5M5 17l3.5-4.5 2.5 3 3.5-4.5L19 17H5"/></svg>
      </div>
      <div className="ac-book__quote">{quoteLines.map((l, i) => <span key={i}>{l}</span>)}</div>
      <div className="ac-book__binding"></div>
    </div>
  );
}
