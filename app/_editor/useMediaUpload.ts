"use client";
import { useState } from "react";
import { upload } from "@vercel/blob/client";

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
      const blob = await upload(`media/${Date.now()}-${f.name}`, f, {
        access: "public",
        handleUploadUrl: "/api/upload/sign",
        contentType: f.type,
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
