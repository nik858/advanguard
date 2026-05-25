"use client";
import { mediaUrl, type MediaRef } from "@/types/content";

function isYouTube(u: string) { return /youtube\.com\/watch|youtu\.be\//.test(u); }
function isVimeo(u: string)   { return /(?:player\.)?vimeo\.com\//.test(u); }
function youTubeId(u: string) { const m = u.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/); return m ? m[1] : ""; }
function vimeoId(u: string)   {
  const m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : "";
}

/**
 * Single, unified video surface used by hero / demo / testimonials.
 *
 * Egress-conscious defaults:
 *   - `<video>` files use `preload="none"` so zero bytes leave Vercel Blob
 *     until the visitor presses play.
 *   - YouTube/Vimeo iframes default to `loading="lazy"` so they only load
 *     once they enter the viewport.
 *
 * `priority` flips the player into eager-load mode for above-the-fold
 * placements (i.e. the hero video). The iframe is fetched in parallel
 * with the rest of the page (not blocking initial render); Vimeo /
 * YouTube paint their own thumbnail + play button as soon as the iframe
 * boots, and the visitor clicks that button to play.
 */
export function VideoPlayer({ src, poster, label, priority = false }: { src: string; poster?: MediaRef; label?: string; edit?: boolean; priority?: boolean }) {
  const posterUrl = mediaUrl(poster);
  const loading = priority ? "eager" : "lazy";
  // fetchPriority is the new fetchpriority HTML attribute; modern browsers
  // (Chrome/Safari) use it to upgrade resource priority. Older browsers
  // ignore it harmlessly.
  const fetchPriority = priority ? "high" : "auto";

  if (!src) {
    return (
      <div className="ac-player">
        <div className="ac-player__poster ac-player__poster--empty" aria-hidden="true" />
      </div>
    );
  }

  if (isYouTube(src)) {
    return (
      <div className="ac-player">
        <iframe
          src={`https://www.youtube.com/embed/${youTubeId(src)}?rel=0&playsinline=1`}
          title={label || "Video"}
          loading={loading}
          // @ts-expect-error fetchpriority is a valid HTML attribute, not yet in React's typings for iframe.
          fetchpriority={fetchPriority}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    );
  }

  if (isVimeo(src)) {
    return (
      <div className="ac-player">
        <iframe
          src={`https://player.vimeo.com/video/${vimeoId(src)}?playsinline=1`}
          title={label || "Video"}
          loading={loading}
          // @ts-expect-error fetchpriority is a valid HTML attribute, not yet in React's typings for iframe.
          fetchpriority={fetchPriority}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className="ac-player">
      <video
        key={src}
        src={src}
        poster={posterUrl || undefined}
        controls
        preload={priority ? "metadata" : "none"}
        playsInline
      />
    </div>
  );
}
