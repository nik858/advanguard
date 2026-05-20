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
 * We deliberately skip the legacy "poster image + custom play overlay" flow:
 * every player now renders the real source straight away, so what the visitor
 * sees before clicking IS the video (file → first frame via `preload="metadata"`,
 * Vimeo/YouTube → their own thumbnail and chrome). Fullscreen, captions and
 * timeline scrubbing come for free from the native browser / platform controls.
 *
 * `poster` is kept in the props for backward compatibility with existing
 * content but is now only used as a fallback when the file itself has no
 * frame to extract yet.
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

  // File (mp4 / webm / mov). preload="metadata" pulls just enough bytes for
  // the browser to display the first frame as the natural preview.
  return (
    <div className="ac-player">
      <video
        key={src}
        src={src}
        poster={posterUrl || undefined}
        controls
        preload="metadata"
        playsInline
      />
    </div>
  );
}
