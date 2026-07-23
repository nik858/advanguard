import { describe, it, expect } from "vitest";
import { resolveVideoSource, withAutoplay } from "@/lib/video-embed";

describe("resolveVideoSource", () => {
  it("returns none for empty input", () => {
    expect(resolveVideoSource("")).toEqual({ kind: "none", src: "" });
    expect(resolveVideoSource("   ")).toEqual({ kind: "none", src: "" });
  });

  it("treats direct media files as files", () => {
    expect(resolveVideoSource("https://example.com/clip.mp4").kind).toBe("file");
    expect(resolveVideoSource("https://example.com/clip.webm?x=1").kind).toBe("file");
    expect(resolveVideoSource("https://example.com/clip.MOV").kind).toBe("file");
  });

  it("treats Vercel Blob uploads as files", () => {
    const url = "https://abc123.public.blob.vercel-storage.com/media/1710000000-clip-x7.mp4";
    expect(resolveVideoSource(url)).toEqual({ kind: "file", src: url });
  });

  it("builds YouTube embed URLs from watch, short and shorts links", () => {
    for (const u of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    ]) {
      expect(resolveVideoSource(u)).toEqual({
        kind: "embed",
        src: "https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0&playsinline=1",
      });
    }
  });

  it("builds Vimeo player URLs and keeps the unlisted-video hash", () => {
    expect(resolveVideoSource("https://vimeo.com/1193670382?fl=ip&fe=ec")).toEqual({
      kind: "embed",
      src: "https://player.vimeo.com/video/1193670382?playsinline=1",
    });
    expect(resolveVideoSource("https://vimeo.com/12345/abcdef123")).toEqual({
      kind: "embed",
      src: "https://player.vimeo.com/video/12345?playsinline=1&h=abcdef123",
    });
    expect(resolveVideoSource("https://player.vimeo.com/video/12345?h=abcdef123")).toEqual({
      kind: "embed",
      src: "https://player.vimeo.com/video/12345?playsinline=1&h=abcdef123",
    });
  });

  it("normalizes Loom share links to embeds", () => {
    expect(resolveVideoSource("https://www.loom.com/share/0281766fa2d04bb788eaf19e65135184")).toEqual({
      kind: "embed",
      src: "https://www.loom.com/embed/0281766fa2d04bb788eaf19e65135184",
    });
  });

  it("normalizes Wistia media links to embeds", () => {
    expect(resolveVideoSource("https://home.wistia.com/medias/e4a27b971d")).toEqual({
      kind: "embed",
      src: "https://fast.wistia.net/embed/iframe/e4a27b971d",
    });
    // Live testimonial URL that the old player wrongly fed into <video>.
    expect(resolveVideoSource("https://advanguard.wistia.com/medias/6sfwfw38hc")).toEqual({
      kind: "embed",
      src: "https://fast.wistia.net/embed/iframe/6sfwfw38hc",
    });
  });

  it("passes VEED embed URLs through, decoding HTML-escaped ampersands", () => {
    // Live testimonial URL — stored with &amp; from a pasted embed snippet.
    const stored = "https://www.veed.io/embed/49ac6fa3-3b72-455b-a43a-154720f81294?watermark=0&amp;color=&amp;sharing=0&amp;title=0";
    expect(resolveVideoSource(stored)).toEqual({
      kind: "embed",
      src: "https://www.veed.io/embed/49ac6fa3-3b72-455b-a43a-154720f81294?watermark=0&color=&sharing=0&title=0",
    });
  });

  it("normalizes Streamable links to embeds", () => {
    expect(resolveVideoSource("https://streamable.com/moo")).toEqual({
      kind: "embed",
      src: "https://streamable.com/e/moo",
    });
  });

  it("passes unknown https URLs through as embeds (pasted embed snippets)", () => {
    const u = "https://iframe.mediadelivery.net/embed/12345/abc-def";
    expect(resolveVideoSource(u)).toEqual({ kind: "embed", src: u });
  });
});

describe("withAutoplay", () => {
  it("appends autoplay to URLs with and without a query", () => {
    expect(withAutoplay("https://player.vimeo.com/video/1?playsinline=1")).toBe(
      "https://player.vimeo.com/video/1?playsinline=1&autoplay=1",
    );
    expect(withAutoplay("https://www.loom.com/embed/abc")).toBe(
      "https://www.loom.com/embed/abc?autoplay=1",
    );
  });
});
