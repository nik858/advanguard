import { Resend } from "resend";

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
    .split(/\n\n+/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

const MAX_ATTEMPTS = 3;
const BACKOFFS_MS = [1000, 3000];

/**
 * Sends the audit email through Resend. Retries up to 3 times on 5xx/network
 * errors with backoff (1s, 3s). Fails fast on 4xx. Throws on missing API key.
 * Callers wrap this in their own try/catch — the lead has already received a
 * 200 from /api/lead by the time this runs.
 */
export async function sendAuditEmail(input: SendAuditEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY not set");
  const client = (Resend as any)(apiKey);

  let lastErr: Error | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const { error } = await client.emails.send({
      from: RESEND_FROM,
      to: input.to,
      subject: input.subject,
      text: input.body,
      html: bodyToHtml(input.body),
    });

    if (!error) return;

    const statusCode = (error as { statusCode?: number }).statusCode;
    const detail = `${statusCode ?? "network"}: ${error.message ?? error.name}`;

    // 4xx → client-side issue, retry won't help.
    if (statusCode !== undefined && statusCode < 500) {
      throw new Error(`Resend ${detail}`);
    }

    lastErr = new Error(`Resend ${detail}`);
    if (attempt < MAX_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, BACKOFFS_MS[attempt - 1]));
    }
  }

  throw lastErr ?? new Error("Resend send failed");
}
