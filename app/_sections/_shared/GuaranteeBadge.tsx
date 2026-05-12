export function GuaranteeBadge({ size = 124 }: { size?: number }) {
  return (
    <div className="ac-badge" style={{ width: size, height: size }}>
      <div className="ac-badge__star" style={{ width: "100%", height: "100%" }}></div>
      <div className="ac-badge__pct" style={{ fontSize: size * 0.18 }}>100%</div>
    </div>
  );
}
