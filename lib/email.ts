import "server-only";
import { Resend, type ErrorResponse } from "resend";
import { bodyToHtml } from "@/lib/audit/template";

export { bodyToHtml };

export const RESEND_FROM = "nik@bookingleak.com";
// Replies land here. The From domain (bookingleak.com) has no mailbox, so a
// Reply-To pointing at the address Nik actually reads is what makes replies
// reachable — no GoDaddy mailbox / paid forwarding needed.
export const RESEND_REPLY_TO = "nik@advanguard.agency";

export type SendAuditEmailInput = {
  to: string;
  subject: string;
  /** Plain-text body. Used both as the `text` field and to derive a default HTML body when `html` is not provided. */
  body: string;
  /** Optional pre-rendered HTML. When set, replaces the auto-paragraph wrap. */
  html?: string;
  /** When set, Resend schedules the send for this moment (max ~72h ahead). */
  scheduledAt?: Date;
};

const MAX_ATTEMPTS = 3;
const BACKOFFS_MS = [1000, 3000];

function isRetriable(error: ErrorResponse): boolean {
  return error.statusCode === null || error.statusCode >= 500;
}

function formatError(error: ErrorResponse): string {
  return `Resend ${error.statusCode ?? "network"}: ${error.message ?? error.name}`;
}

function getClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY not set");
  return new Resend(apiKey);
}

/**
 * Sends an audit email through Resend (immediately or scheduled). Returns the
 * Resend email id on success. Retries up to 3 times on 5xx, network, and
 * thrown-from-SDK errors with backoff (1s, 3s). Fails fast on 4xx. Throws
 * on missing API key.
 */
export async function sendAuditEmail(input: SendAuditEmailInput): Promise<string> {
  const client = getClient();
  let lastErr: Error | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let error: ErrorResponse | null = null;
    try {
      const res = await client.emails.send({
        from: RESEND_FROM,
        replyTo: RESEND_REPLY_TO,
        to: input.to,
        subject: input.subject,
        text: input.body,
        html: input.html ?? bodyToHtml(input.body),
        ...(input.scheduledAt ? { scheduledAt: input.scheduledAt.toISOString() } : {}),
      });
      error = res.error;
      if (!error && res.data?.id) return res.data.id;
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, BACKOFFS_MS[attempt - 1]));
      }
      continue;
    }

    if (!error) {
      // No error but no id either — treat as unexpected and fall through to retry.
      lastErr = new Error("Resend returned no id");
    } else if (!isRetriable(error)) {
      throw new Error(formatError(error));
    } else {
      lastErr = new Error(formatError(error));
    }

    if (attempt < MAX_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, BACKOFFS_MS[attempt - 1]));
    }
  }

  throw lastErr ?? new Error("Resend send failed");
}

/**
 * Cancels a previously-scheduled Resend email. Throws on API failure. Callers
 * should iterate over scheduled ids and catch per-id errors — one cancel failing
 * shouldn't prevent the others from being attempted.
 */
export async function cancelScheduledEmail(id: string): Promise<void> {
  const client = getClient();
  const res = await client.emails.cancel(id);
  if (res.error) {
    // Resend returns a 404 if the email was already sent or never scheduled —
    // treat that as a no-op so callers don't need to special-case it.
    if (res.error.statusCode === 404) return;
    throw new Error(formatError(res.error));
  }
}
