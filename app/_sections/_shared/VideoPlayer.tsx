"use client";
import { useEffect, useRef } from "react";
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
 * Hero-only Vimeo embed that uses the Player.js SDK to pre-buffer the first
 * seconds of video without showing motion to the visitor. Flow:
 *
 *   1. iframe mounts with the standard Vimeo URL — Vimeo shows its thumbnail.
 *   2. Right after mount, we lazy-import `@vimeo/player`, instantiate a
 *      Player against the iframe, force-mute, start playing, then pause as
 *      soon as the first frame has decoded.
 *   3. Vimeo's pipeline keeps the decoded chunks in its buffer. When the
 *      visitor clicks play (using Vimeo's own play button) the video starts
 *      instantly — the bytes are already in memory.
 *
 * The brief play/pause cycle is muted and lasts a single render tick, so
 * the visitor sees the thumbnail the entire time. Falls back gracefully to
 * a normal eager-loaded iframe if autoplay is blocked or the SDK fails to
 * load. Bandwidth cost is roughly the first 2-4 seconds of video per
 * visitor (much smaller than a full play).
 */
function VimeoPriorityPlayer({ videoId, label }: { videoId: string; label?: string }) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    let cancelled = false;

    (async () => {
      try {
        const { default: Player } = await import("@vimeo/player");
        if (cancelled) return;
        const player = new Player(iframe);
        await player.ready();
        await player.setVolume(0);
        await player.setMuted(true);
        await player.play();
        // Pause on the very next tick — Vimeo keeps the prefetched buffer
        // around so the click-to-play that follows starts instantly.
        await player.pause();
        await player.setCurrentTime(0);
        // Restore the unmuted state so the visitor's click plays with sound.
        await player.setMuted(false);
        await player.setVolume(1);
      } catch {
        /* autoplay blocked or SDK error — iframe still works as a normal,
           eager-loaded Vimeo player; click-to-play is just slightly slower. */
      }
    })();

    return () => { cancelled = true; };
  }, []);

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
    </div>
  );
}
