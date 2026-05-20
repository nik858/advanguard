"use client";
import type { MediaRef } from "@/types/content";

function isYouTube(u: string) { return /youtube\.com\/watch|youtu\.be\//.test(u); }
function isVimeo(u: string)   { return /(?:player\.)?vimeo\.com\//.test(u); }
function youTubeId(u: string) { const m = u.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/); return m ? m[1] : ""; }
function vimeoId(u: string)   {
  const m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : "";
}

/**
 * Adds a `#t=0.001` media-fragment to a video URL so the browser is forced
 * to seek to ~0s and decode that frame. Without it, Safari (and iOS Safari
 * especially) renders a blank/black canvas for `<video preload="metadata">`
 * because metadata alone does not include any decoded picture data.
 */
function withFirstFrameHint(url: string): string {
  if (!url) return url;
  if (url.includes("#")) return url;
  return `${url}#t=0.001`;
}

/**
 * Single, unified video surface used by hero / demo / testimonials.
 *
 * We deliberately skip the legacy "poster image + custom play overlay" flow:
 * every player now renders the real source straight away, so what the visitor
 * sees before clicking IS the video (file → first decoded frame, Vimeo/YouTube
 * → their own thumbnail and chrome). Fullscreen, captions and timeline
 * scrubbing come for free from the native browser / platform controls.
 *
 * The `poster` prop is accepted for backwards compatibility but ignored —
 * the real first frame is what the user wants to see, and a stale static
 * image overrides it (Safari prefers `poster` over the decoded frame).
 */
export function VideoPlayer({ src, label }: { src: string; poster?: MediaRef; label?: string; edit?: boolean }) {
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
        src={withFirstFrameHint(src)}
        controls
        preload="metadata"
        playsInline
      />
    </div>
  );
}
