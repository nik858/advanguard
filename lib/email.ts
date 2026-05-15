import "server-only";
import { Resend, type ErrorResponse } from "resend";

export const RESEND_FROM = "onboarding@resend.dev";

export type SendAuditEmailInput = {
  to: string;
  subject: string;
  body: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function bodyToHtml(body: string): string {
  return body
    .replace(/\r\n?/g, "\n")
    .split(/\n\n+/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

const MAX_ATTEMPTS = 3;
const BACKOFFS_MS = [1000, 3000];

function isRetriable(error: ErrorResponse): boolean {
  return error.statusCode === null || error.statusCode >= 500;
}

function formatError(error: ErrorResponse): string {
  return `Resend ${error.statusCode ?? "network"}: ${error.message ?? error.name}`;
}

/**
 * Sends the audit email through Resend. Retries up to 3 times on 5xx, network,
 * and thrown-from-SDK errors with backoff (1s, 3s). Fails fast on 4xx. Throws
 * on missing API key. Callers wrap this in their own try/catch — the lead has
 * already received a 200 from /api/lead by the time this runs.
 */
export async function sendAuditEmail(input: SendAuditEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY not set");
  const client = new Resend(apiKey);

  let lastErr: Error | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let error: ErrorResponse | null = null;
    try {
      const res = await client.emails.send({
        from: RESEND_FROM,
        to: input.to,
        subject: input.subject,
        text: input.body,
        html: bodyToHtml(input.body),
      });
      error = res.error;
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, BACKOFFS_MS[attempt - 1]));
      }
      continue;
    }

    if (!error) return;

    if (!isRetriable(error)) {
      throw new Error(formatError(error));
    }

    lastErr = new Error(formatError(error));
    if (attempt < MAX_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, BACKOFFS_MS[attempt - 1]));
    }
  }

  throw lastErr ?? new Error("Resend send failed");
}
