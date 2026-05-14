import Anthropic from "@anthropic-ai/sdk";
import type { Signals, Lead, AuditEmail } from "@/types/audit";
import { loadPrompts } from "@/lib/audit/prompts";
import { formatSignalsForPrompt } from "@/lib/audit/signals";

const MODEL = "claude-haiku-4-5-20251001";

/**
 * Generates a personalized audit email with Claude. Loads the active prompt set,
 * feeds it the formatted signals, and parses Claude's JSON response.
 * Throws on missing API key, API failure, or unparseable response — the caller
 * (the orchestrator) catches and switches to the fallback email.
 */
export async function generateAuditEmail(signals: Signals, lead: Lead): Promise<AuditEmail> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const prompts = await loadPrompts();
  const client = new Anthropic({ apiKey });

  const userMessage = [
    `Clinic owner first name: ${lead.firstName || "(unknown)"}`,
    `Clinic email domain: ${lead.domain}`,
    ``,
    formatSignalsForPrompt(signals),
    ``,
    `--- Your task ---`,
    `Tone: ${prompts.tone}`,
    `Email body instructions: ${prompts.email_instructions}`,
    `Subject line instructions: ${prompts.subject_instructions}`,
    `Sign the email as: ${prompts.signature}`,
    ``,
    `Respond with ONLY a JSON object, no markdown, no code fence, in exactly this shape:`,
    `{"subject": "<the subject line>", "body": "<the full email body>"}`,
  ].join("\n");

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: [{ type: "text", text: prompts.system_prompt, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = res.content.find((b) => b.type === "text");
  const raw = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";

  // Tolerate a stray code fence around the JSON.
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
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
