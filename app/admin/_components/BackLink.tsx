import Link from "next/link";

export function BackLink() {
  return (
    <Link
      href="/admin"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        color: "#71717a",
        fontSize: 13,
        fontWeight: 500,
        textDecoration: "none",
      }}
    >
      <span style={{ fontSize: 15, lineHeight: 1 }} aria-hidden>
        &larr;
      </span>
      Dashboard
    </Link>
  );
}
