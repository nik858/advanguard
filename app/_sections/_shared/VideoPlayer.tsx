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
 *     until the visitor presses play. Combined with the `loading="lazy"`
 *     iframes for YouTube/Vimeo, a page view that scrolls past the player
 *     without interacting costs us nothing on the bandwidth quota.
 *   - When an operator has uploaded a poster image we render it via the
 *     native `poster` attribute (a single ~50 KB request, browser-cached
 *     across visits). Without a poster the visitor sees the standard
 *     native play button on a black canvas — still clearly a video.
 */
export function VideoPlayer({ src, poster, label }: { src: string; poster?: MediaRef; label?: string; edit?: boolean }) {
  const posterUrl = mediaUrl(poster);

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
          loading="lazy"
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
          loading="lazy"
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
        preload="none"
        playsInline
      />
    </div>
  );
}
