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

export type LeadPayload = {
  email: string;
  first_name?: string;
  phone?: string;
  domain?: string;
  source?: string;
  vertical?: string;
  submitted_at?: string;
  user_agent?: string;
  ip_hash?: string;
};

export async function postLeadToGHL(payload: LeadPayload): Promise<void> {
  const url = process.env.GHL_LEAD_WEBHOOK_URL;
  if (!url) throw new Error("GHL_LEAD_WEBHOOK_URL not set");
  await postWithRetry(url, { source: "advanguard-landing", submitted_at: new Date().toISOString(), ...payload });
}

export type AuditPayload = {
  email: string;
  domain: string;
  audit_score: number;
  audit_strengths: string[];
  audit_weaknesses: string[];
  audit_signals_json: string;
  ai_email_1_subject: string;
  ai_email_1_body: string;
  ai_diagnosis_tags: string[];
  audited_at?: string;
};

export async function postAuditToGHL(payload: AuditPayload): Promise<void> {
  const url = process.env.GHL_AUDIT_WEBHOOK_URL;
  if (!url) throw new Error("GHL_AUDIT_WEBHOOK_URL not set");
  await postWithRetry(url, { audited_at: new Date().toISOString(), ...payload });
}
