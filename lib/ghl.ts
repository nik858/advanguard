async function postWithRetry(url: string, body: unknown, max = 3): Promise<void> {
  let lastErr: unknown;
  for (let i = 0; i < max; i++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) return;
      if (res.status < 500) throw new Error(`GHL ${res.status}: ${await res.text()}`);
      lastErr = new Error(`GHL ${res.status}`);
    } catch (e) { lastErr = e; }
    if (i < max - 1) await new Promise((r) => setTimeout(r, 1000 * Math.pow(3, i)));
  }
  throw lastErr;
}

/**
 * Payload for the GHL "Audit Email" inbound webhook. The GHL workflow maps
 * these exact field names: email -> contact Email, first_name -> contact First Name,
 * ai_email_subject -> email subject, ai_email_body -> email body.
 */
export type AuditWebhookPayload = {
  email: string;
  first_name: string;
  ai_email_subject: string;
  ai_email_body: string;
};

/** POSTs the finished audit (or fallback) email to the GHL "Audit Email" webhook. */
export async function postAuditToGHL(payload: AuditWebhookPayload): Promise<void> {
  const url = process.env.GHL_AUDIT_WEBHOOK_URL;
  if (!url) throw new Error("GHL_AUDIT_WEBHOOK_URL not set");
  await postWithRetry(url, payload);
}
