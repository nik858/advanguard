"use client";
import { useState } from "react";
import { upload } from "@vercel/blob/client";

/** Raster formats worth re-encoding. SVG stays vector; GIF may be animated. */
const COMPRESSIBLE = ["image/png", "image/jpeg", "image/webp"];
const MAX_DIMENSION = 1920;
const WEBP_QUALITY = 0.82;

/**
 * Downscales a raster image to at most MAX_DIMENSION px and re-encodes it as
 * WebP before upload. Blob egress is metered (10 GB/month on the free tier),
 * and a single uncompressed AI-generated PNG served to every visitor once
 * exhausted the whole quota — so nothing heavy may reach the store. Falls back
 * to the original file whenever conversion fails or does not actually shrink.
 */
async function compressImage(f: File): Promise<File> {
  if (!COMPRESSIBLE.includes(f.type)) return f;
  try {
    const bitmap = await createImageBitmap(f);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return f;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", WEBP_QUALITY),
    );
    if (!blob || blob.type !== "image/webp" || blob.size >= f.size) return f;
    const name = f.name.replace(/\.[^.]+$/, "") + ".webp";
    return new File([blob], name, { type: "image/webp" });
  } catch {
    return f;
  }
}

/**
 * Uploads a File to Vercel Blob under media/ and returns its public URL (or
 * null on failure). Tracks upload progress (0-100) so the UI can render a
 * visible indicator — Vercel Blob streams large files (videos can be hundreds
 * of MB) and without progress feedback the user thinks the editor is broken.
 */
export function useMediaUpload() {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function uploadFile(f: File): Promise<string | null> {
    setBusy(true);
    setError(null);
    setProgress(0);
    try {
      const compressed = await compressImage(f);
      const blob = await upload(`media/${Date.now()}-${compressed.name}`, compressed, {
        access: "public",
        handleUploadUrl: "/api/upload/sign",
        contentType: compressed.type,
        onUploadProgress: (event) => {
          // event.percentage is a 0-100 number from the SDK.
          if (typeof event?.percentage === "number") setProgress(event.percentage);
        },
      });
      setProgress(100);
      return blob.url;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  return { uploadFile, busy, progress, error };
}
