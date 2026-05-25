"use client";
import { useEffect, useRef, useState } from "react";
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
 *
 * `priority` flips the player into eager-load mode for above-the-fold
 * placements (i.e. the hero video). The iframe is then fetched in parallel
 * with the rest of the page load (not blocking initial render) and the
 * Vimeo/YouTube SDK is fully bootstrapped by the time the visitor clicks
 * play — usually under 500 ms instead of the 1-2 s of a cold lazy load.
 * Default is false so testimonial videos stay lazy and don't waste
 * bandwidth before the visitor scrolls to them.
 */
export function VideoPlayer({ src, poster, label, priority = false }: { src: string; poster?: MediaRef; label?: string; edit?: boolean; priority?: boolean }) {
  const posterUrl = mediaUrl(poster);
  const loading = priority ? "eager" : "lazy";
  // fetchPriority is React's lowercase form for the new fetchpriority HTML
  // attribute; modern browsers (Chrome/Safari) use it to upgrade resource
  // priority. Older browsers ignore it harmlessly.
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
    if (priority) {
      return <VimeoPriorityPlayer videoId={vimeoId(src)} label={label} />;
    }
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
        // priority video files buffer just the metadata + first frame on
        // load (~few hundred KB) so click-to-play is instant. Non-priority
        // files stay at preload="none" to preserve free-tier egress.
        preload={priority ? "metadata" : "none"}
        playsInline
      />
    </div>
  );
}

/**
 * Hero-only Vimeo embed: shows the video's own poster as a static
 * thumbnail overlay, while pre-buffering the first seconds of video in the
 * background via the Player.js SDK. When the visitor clicks our play
 * button the overlay fades out and Vimeo plays instantly because the
 * bytes are already decoded.
 *
 * Why an explicit overlay: Vimeo's default poster sometimes shows black
 * (no custom thumbnail set, fade-in opening, etc.) and our play()+pause()
 * pre-buffer can leave the player paused on the first decoded frame
 * rather than the configured poster. The overlay sidesteps both issues
 * by always showing the canonical thumbnail (served by Vimeo's vumbnail
 * CDN, ~50-100 KB, browser-cached).
 *
 * Fallback: if the SDK fails to load or autoplay is blocked, the overlay
 * still shows; clicking it removes the overlay and the visitor sees
 * Vimeo's own player (which they can press play on directly).
 */
function VimeoPriorityPlayer({ videoId, label }: { videoId: string; label?: string }) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  // Using `any` here only inside the file scope — the SDK has its own types
  // but importing them eagerly would defeat the lazy import.
  const playerRef = useRef<{ play: () => Promise<unknown>; setVolume: (v: number) => Promise<unknown>; setMuted: (m: boolean) => Promise<unknown>; pause: () => Promise<unknown>; setCurrentTime: (t: number) => Promise<unknown>; ready: () => Promise<unknown> } | null>(null);
  const [overlayHidden, setOverlayHidden] = useState(false);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    let cancelled = false;

    (async () => {
      try {
        const { default: Player } = await import("@vimeo/player");
        if (cancelled) return;
        const player = new Player(iframe);
        playerRef.current = player;
        await player.ready();
        await player.setVolume(0);
        await player.setMuted(true);
        await player.play();
        await player.pause();
        await player.setCurrentTime(0);
        await player.setMuted(false);
        await player.setVolume(1);
      } catch {
        /* autoplay blocked or SDK error — overlay click still works,
           Vimeo's own player will simply have a bit of buffering. */
      }
    })();

    return () => { cancelled = true; };
  }, []);

  function onPlayClick() {
    setOverlayHidden(true);
    playerRef.current?.play().catch(() => { /* visitor can press Vimeo's own play */ });
  }

  return (
    <div className="ac-player">
      <iframe
        ref={iframeRef}
        src={`https://player.vimeo.com/video/${videoId}?playsinline=1`}
        title={label || "Video"}
        loading="eager"
        // @ts-expect-error fetchpriority is a valid HTML attribute, not yet in React's typings for iframe.
        fetchpriority="high"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
      {!overlayHidden && (
        <button
          type="button"
          onClick={onPlayClick}
          aria-label={label ? `Play ${label}` : "Play video"}
          className="ac-player__overlay"
          style={{
            backgroundImage: `url(https://vumbnail.com/${videoId}_large.jpg)`,
          }}
        >
          <span className="ac-player__overlay-play" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}
