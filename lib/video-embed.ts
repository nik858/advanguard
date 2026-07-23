/**
 * Classifies a video URL for the shared VideoPlayer.
 *
 * - "file"  → direct media file (or Vercel Blob upload): render a <video> tag.
 * - "embed" → hosted player: render an <iframe>. Known hosts get their share
 *             URLs normalized to embeddable player URLs; anything else is
 *             iframed as-is, which covers any host whose "Embed" snippet the
 *             editor pasted (MediaSlot extracts the iframe src).
 * - "none"  → empty slot.
 */
export type VideoSource = { kind: "file" | "embed" | "none"; src: string };

const FILE_EXT = /\.(mp4|webm|mov|m4v|ogv)$/i;

export function resolveVideoSource(raw: string): VideoSource {
  let src = (raw || "").trim();
  // URLs copied out of embed snippets often carry HTML-escaped ampersands
  // (sometimes doubly escaped); normalize so query params parse correctly.
  while (src.includes("&amp;")) src = src.replace(/&amp;/g, "&");
  if (!src) return { kind: "none", src: "" };

  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return { kind: "file", src }; // relative path — assume a local file
  }

  if (FILE_EXT.test(url.pathname) || url.hostname.endsWith(".vercel-storage.com")) {
    return { kind: "file", src };
  }

  const host = url.hostname.replace(/^www\./, "");

  if (host === "youtube.com" || host === "youtu.be" || host === "youtube-nocookie.com") {
    const id =
      host === "youtu.be"
        ? url.pathname.slice(1).split("/")[0]
        : url.searchParams.get("v") || url.pathname.match(/\/(?:embed|shorts|live)\/([\w-]{11})/)?.[1] || "";
    if (id) return { kind: "embed", src: `https://www.youtube.com/embed/${id}?rel=0&playsinline=1` };
  }

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const m = url.pathname.match(/\/(?:video\/)?(\d+)(?:\/([\da-f]+))?/i);
    if (m) {
      const hash = m[2] || url.searchParams.get("h") || "";
      return {
        kind: "embed",
        src: `https://player.vimeo.com/video/${m[1]}?playsinline=1${hash ? `&h=${hash}` : ""}`,
      };
    }
  }

  if (host === "loom.com") {
    const m = url.pathname.match(/\/(?:share|embed)\/([\da-f]+)/i);
    if (m) return { kind: "embed", src: `https://www.loom.com/embed/${m[1]}` };
  }

  if (host.endsWith("wistia.com") || host.endsWith("wistia.net")) {
    const m = url.pathname.match(/\/(?:medias|embed\/iframe)\/([\w]+)/);
    if (m) return { kind: "embed", src: `https://fast.wistia.net/embed/iframe/${m[1]}` };
  }

  if (host === "streamable.com") {
    const m = url.pathname.match(/^\/(?:e\/)?([\w]+)/);
    if (m) return { kind: "embed", src: `https://streamable.com/e/${m[1]}` };
  }

  return { kind: "embed", src };
}

/** Adds autoplay=1 for the click-to-play poster facade (understood by
 *  YouTube, Vimeo, Loom, Streamable; harmless elsewhere). */
export function withAutoplay(src: string): string {
  return `${src}${src.includes("?") ? "&" : "?"}autoplay=1`;
}
