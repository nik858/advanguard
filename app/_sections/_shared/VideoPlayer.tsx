"use client";
import { useState } from "react";
import { mediaUrl, type MediaRef } from "@/types/content";
import { resolveVideoSource, withAutoplay } from "@/lib/video-embed";
import { Icons } from "./Icons";

/**
 * Single, unified video surface used by hero / demo / testimonials.
 *
 * URL handling lives in lib/video-embed: direct files (and Blob uploads)
 * render a <video>; everything else renders a hosted-player <iframe>, with
 * share-link normalization for YouTube / Vimeo / Loom / Wistia / Streamable
 * and a pass-through for any other embeddable URL.
 *
 * Custom thumbnails: when a poster image is set on an iframe-hosted video,
 * the player renders the poster + play button instead of the iframe
 * (click-to-play facade). The iframe is only mounted after the click, with
 * autoplay — so the operator controls the thumbnail regardless of what the
 * video host allows on its own tier, and no third-party bytes load until
 * the visitor opts in.
 *
 * Egress-conscious defaults:
 *   - `<video>` files use `preload="none"` so zero bytes leave Vercel Blob
 *     until the visitor presses play.
 *   - iframes without a poster default to `loading="lazy"` so they only load
 *     once they enter the viewport.
 *
 * `priority` flips the no-poster iframe into eager-load mode for
 * above-the-fold placements (i.e. the hero video).
 */
export function VideoPlayer({ src, poster, label, priority = false }: { src: string; poster?: MediaRef; label?: string; edit?: boolean; priority?: boolean }) {
  const posterUrl = mediaUrl(poster);
  const [activated, setActivated] = useState(false);
  const source = resolveVideoSource(src);

  if (source.kind === "none") {
    return (
      <div className="ac-player">
        <div className="ac-player__poster ac-player__poster--empty" aria-hidden="true" />
      </div>
    );
  }

  if (source.kind === "file") {
    return (
      <div className="ac-player">
        <video
          key={source.src}
          src={source.src}
          poster={posterUrl || undefined}
          controls
          preload={priority ? "metadata" : "none"}
          playsInline
        />
      </div>
    );
  }

  if (posterUrl && !activated) {
    return (
      <div className="ac-player">
        <button
          type="button"
          className="ac-player__overlay"
          style={{ backgroundImage: `url(${posterUrl})` }}
          onClick={() => setActivated(true)}
          aria-label={`Play: ${label || "video"}`}
        >
          <span className="ac-player__overlay-play"><Icons.Play /></span>
        </button>
      </div>
    );
  }

  return (
    <div className="ac-player">
      <iframe
        src={activated ? withAutoplay(source.src) : source.src}
        title={label || "Video"}
        loading={priority || activated ? "eager" : "lazy"}
        // @ts-expect-error fetchpriority is a valid HTML attribute, not yet in React's typings for iframe.
        fetchpriority={priority ? "high" : "auto"}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
      />
    </div>
  );
}
