import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, SESSION_CONFIG } from "@/lib/auth";

const ALLOWED_IMAGE = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "image/gif",
];
const ALLOWED_VIDEO = ["video/mp4", "video/webm", "video/quicktime"];

/* Blob egress is metered (10 GB/month free) and public blobs are served
 * straight to visitors, so heavy files must never reach the store. The editor
 * compresses images client-side before upload; these caps are the backstop
 * for anything that bypasses it. Videos should live on Vimeo, not Blob. */
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

const VIDEO_EXT = /\.(mp4|webm|mov)$/i;

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const c = await cookies();
        const token = c.get(SESSION_CONFIG.cookieName)?.value;
        const session = token ? await verifySession(token) : null;
        if (!session) throw new Error("Unauthorized");
        const isVideo = VIDEO_EXT.test(pathname);
        return {
          allowedContentTypes: isVideo ? ALLOWED_VIDEO : ALLOWED_IMAGE,
          addRandomSuffix: true,
          maximumSizeInBytes: isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES,
          tokenPayload: JSON.stringify({ sub: session.sub, pathname }),
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log("[upload] completed", blob.pathname);
      },
    });
    return NextResponse.json(json);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 401 });
  }
}
