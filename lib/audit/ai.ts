import Anthropic from "@anthropic-ai/sdk";
import type { Signals, Lead, AuditEmail, SignalsV2 } from "@/types/audit";
import { type PromptsV2, type MailKey } from "@/types/prompts";
import { loadPrompts } from "@/lib/audit/prompts";
import { formatSignalsForPrompt } from "@/lib/audit/signals";
import { formatSignalsV2ForPrompt } from "@/lib/audit/signals-v2";

const MODEL = "claude-opus-4-7";
const MAX_TOKENS = 2048;
const MAIL_KEYS: MailKey[] = ["mail_1", "mail_2", "mail_3"];

export type AuditEmails = Record<MailKey, AuditEmail>;

function buildUserMessage(
  prompts: PromptsV2,
  mailKey: MailKey,
  signals: Signals,
  signalsV2: SignalsV2 | null,
  lead: Lead,
): string {
  const mail = prompts.emails[mailKey];
  const signalBlock = signalsV2
    ? formatSignalsV2ForPrompt(signalsV2)
    : formatSignalsForPrompt(signals);
  return [
    `You are writing email #${mailKey.replace("mail_", "")} of a 3-email sequence.`,
    `Clinic owner first name: ${lead.firstName || "(unknown)"}`,
    `Clinic email domain: ${lead.domain}`,
    ``,
    signalBlock,
    ``,
    `--- Your task ---`,
    `Tone: ${prompts.shared.tone}`,
    `Email body instructions: ${mail.email_instructions}`,
    `Subject line instructions: ${mail.subject_instructions}`,
    `Sign the email as: ${prompts.shared.signature}`,
    ``,
    `Respond with ONLY a JSON object, no markdown, no code fence, in exactly this shape:`,
    `{"subject": "<the subject line>", "body": "<the full email body>"}`,
  ].join("\n");
}

function parseClaudeJson(raw: string): AuditEmail {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Claude response was not valid JSON");
  }
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.subject !== "string" || typeof obj.body !== "string" || !obj.subject || !obj.body) {
    throw new Error("Claude response missing subject/body");
  }
  return { subject: obj.subject, body: obj.body };
}

async function generateSingleEmail(
  client: Anthropic,
  prompts: PromptsV2,
  mailKey: MailKey,
  signals: Signals,
  signalsV2: SignalsV2 | null,
  lead: Lead,
): Promise<AuditEmail> {
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: [{ type: "text", text: prompts.shared.system_prompt, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: buildUserMessage(prompts, mailKey, signals, signalsV2, lead) }],
  });
  const textBlock = res.content.find((b) => b.type === "text");
  const raw = textBlock && textBlock.type === "text" ? textBlock.text : "";
  return parseClaudeJson(raw);
}

/**
 * Generates all 3 sequence emails for one lead. Uses Claude Opus and runs the
 * three calls in parallel, sharing the cached system prompt across them.
 *
 * Throws on missing API key. If a per-mail call fails, that entry comes back
 * as `null` in `emails` with a reason in `errors` — the orchestrator decides
 * whether to fall back per-mail.
 */
export async function generateAuditEmails(
  signals: Signals,
  lead: Lead,
  promptsOverride?: PromptsV2,
): Promise<{ emails: Record<MailKey, AuditEmail | null>; errors: Record<MailKey, string | null> }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const prompts = promptsOverride ?? (await loadPrompts());
  const client = new Anthropic({ apiKey });
  const signalsV2 = signals.v2 ?? null;

  const results = await Promise.all(
    MAIL_KEYS.map(async (key) => {
      try {
        const email = await generateSingleEmail(client, prompts, key, signals, signalsV2, lead);
        return { key, email, error: null as string | null };
      } catch (e) {
        return { key, email: null as AuditEmail | null, error: e instanceof Error ? e.message : String(e) };
      }
    }),
  );

  const emails: Record<MailKey, AuditEmail | null> = { mail_1: null, mail_2: null, mail_3: null };
  const errors: Record<MailKey, string | null> = { mail_1: null, mail_2: null, mail_3: null };
  for (const r of results) {
    emails[r.key] = r.email;
    errors[r.key] = r.error;
  }
  return { emails, errors };
}

/**
 * Back-compat shim. Generates just mail 1 using the loaded prompts. Kept so
 * older callers (and tests) that import the singular function keep compiling.
 */
export async function generateAuditEmail(
  signals: Signals,
  lead: Lead,
  promptsOverride?: PromptsV2,
): Promise<AuditEmail> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
  const prompts = promptsOverride ?? (await loadPrompts());
  const client = new Anthropic({ apiKey });
  return generateSingleEmail(client, prompts, "mail_1", signals, signals.v2 ?? null, lead);
}
