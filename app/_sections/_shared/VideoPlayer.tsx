"use client";
import { useCallback, useState } from "react";
import { Icons } from "./Icons";
import { mediaUrl, type MediaRef } from "@/types/content";

function isYouTube(u: string) { return /youtube\.com\/watch|youtu\.be\//.test(u); }
function isVimeo(u: string)   { return /vimeo\.com\//.test(u); }
function youTubeId(u: string) { const m = u.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/); return m ? m[1] : ""; }
function vimeoId(u: string)   { const m = u.match(/vimeo\.com\/(\d+)/); return m ? m[1] : ""; }

export function VideoPlayer({ src, poster, label }: { src: string; poster: MediaRef; label?: string }) {
  const [playing, setPlaying] = useState(false);
  const posterUrl = mediaUrl(poster);
  const onActivate = useCallback(() => { if (src) setPlaying(true); }, [src]);
  const onKey = useCallback((e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && src) { e.preventDefault(); setPlaying(true); }
  }, [src]);

  if (!playing) {
    const isFile = !!src && !isYouTube(src) && !isVimeo(src);
    // A direct video file with no poster has nothing to show — render the
    // video element itself (first frame + native controls) instead of a
    // broken/empty poster image.
    if (isFile && !posterUrl) {
      return (
        <div className="ac-player">
          <video src={src} controls preload="metadata" playsInline />
        </div>
      );
    }
    return (
      <div className="ac-player" role="button" tabIndex={src ? 0 : -1} aria-label={label || "Play video"} onClick={onActivate} onKeyDown={onKey}>
        {posterUrl
          ? <img className="ac-player__poster" src={posterUrl} alt={label || "Video preview"} loading="lazy" decoding="async" width={1280} height={720} />
          : <div className="ac-player__poster ac-player__poster--empty" aria-hidden="true" />}
        {src && <div className="ac-player__play"><div className="ac-player__play-icon"><Icons.Play/></div></div>}
      </div>
    );
  }
  if (isYouTube(src)) {
    return <iframe src={`https://www.youtube.com/embed/${youTubeId(src)}?autoplay=1&rel=0`} title={label || "Video"} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />;
  }
  if (isVimeo(src)) {
    return <iframe src={`https://player.vimeo.com/video/${vimeoId(src)}?autoplay=1`} title={label || "Video"} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />;
  }
  return <video src={src} poster={posterUrl} controls autoPlay playsInline />;
}
