// Server Component. Escapes `<` to prevent `</script>` injection in JSON content.
function safeJson(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}

export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // Safe: we control `data` and escape `<` chars to prevent `</script>` injection.
      dangerouslySetInnerHTML={{ __html: safeJson(data) }}
    />
  );
}
