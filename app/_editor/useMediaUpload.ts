"use client";
import { useState } from "react";
import { upload } from "@vercel/blob/client";

/** Uploads a File to Vercel Blob under media/ and returns its public URL (or null on failure). */
export function useMediaUpload() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadFile(f: File): Promise<string | null> {
    setBusy(true);
    setError(null);
    try {
      const blob = await upload(`media/${Date.now()}-${f.name}`, f, {
        access: "public",
        handleUploadUrl: "/api/upload/sign",
        contentType: f.type,
      });
      return blob.url;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  return { uploadFile, busy, error };
}
