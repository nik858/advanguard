import { z } from "zod";

export const DEFAULT_HTML_TEMPLATE = [
  `<!doctype html>`,
  `<html lang="en">`,
  `  <head>`,
  `    <meta charset="utf-8" />`,
  `    <meta name="viewport" content="width=device-width,initial-scale=1" />`,
  `    <title>{{subject}}</title>`,
  `  </head>`,
  `  <body style="margin:0;padding:24px;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#18181b;">`,
  `    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;">`,
  `      <tr>`,
  `        <td style="padding:32px;font-size:15px;line-height:1.55;">`,
  `          {{body_html}}`,
  `          <p style="margin:24px 0 0;color:#71717a;font-size:13px;">{{signature}}</p>`,
  `        </td>`,
  `      </tr>`,
  `    </table>`,
  `  </body>`,
  `</html>`,
].join("\n");

const HtmlTemplateSchema = z
  .string()
  .min(1)
  .refine((s) => s.includes("{{body_html}}"), {
    message: "html_template must include the {{body_html}} placeholder",
  });

const MailConfigSchema = z.object({
  delay_hours: z.number().min(0).max(72),
  email_instructions: z.string().min(1),
  subject_instructions: z.string().min(1),
});

const SharedSchema = z.object({
  system_prompt: z.string().min(1),
  tone: z.string().min(1),
  signature: z.string().min(1),
});

export const PromptsV2Schema = z.object({
  version: z.literal(2),
  shared: SharedSchema,
  html_template: HtmlTemplateSchema,
  emails: z.object({
    mail_1: MailConfigSchema,
    mail_2: MailConfigSchema,
    mail_3: MailConfigSchema,
  }),
});

export type PromptsV2 = z.infer<typeof PromptsV2Schema>;
export type MailConfig = z.infer<typeof MailConfigSchema>;
export type MailKey = "mail_1" | "mail_2" | "mail_3";

// Legacy v1 schema kept for migration only.
const PromptsV1Schema = z.object({
  version: z.union([z.literal(1), z.undefined()]).optional(),
  system_prompt: z.string().min(1),
  email_instructions: z.string().min(1),
  subject_instructions: z.string().min(1),
  tone: z.string().min(1),
  signature: z.string().min(1),
});

/**
 * Migrates a v1 prompts blob into v2 in memory. Mail 1 inherits the v1 instructions
 * verbatim. Mail 2 and Mail 3 get seeded defaults that we will overwrite as soon as
 * Nik saves the editor — the goal here is to avoid breaking running audits.
 */
function migrateV1ToV2(v1: z.infer<typeof PromptsV1Schema>): PromptsV2 {
  return {
    version: 2,
    shared: {
      system_prompt: v1.system_prompt,
      tone: v1.tone,
      signature: v1.signature,
    },
    html_template: DEFAULT_HTML_TEMPLATE,
    emails: {
      mail_1: {
        delay_hours: 0,
        email_instructions: v1.email_instructions,
        subject_instructions: v1.subject_instructions,
      },
      mail_2: {
        delay_hours: 24,
        email_instructions:
          "Follow-up #2 — focus on funnel/conversion signals (#7-10): images per service page, pricing visibility, homepage video, page speed. Reference one signal Nik didn't cover in mail 1. Keep it short.",
        subject_instructions: v1.subject_instructions,
      },
      mail_3: {
        delay_hours: 48,
        email_instructions:
          "Follow-up #3 — focus on authority/trust signals (#11-16): team credentials, SSL, LocalBusiness schema, multilingual support, financing/insurance partners, FAQ. Last mail — propose a 15-minute call.",
        subject_instructions: v1.subject_instructions,
      },
    },
  };
}

/**
 * Parses any prompts payload (v1 or v2) into the canonical v2 shape. Returns
 * null when the payload matches no known schema — callers should fall back to
 * the bundled default.
 */
export function parsePromptsPayload(raw: unknown): PromptsV2 | null {
  const v2 = PromptsV2Schema.safeParse(raw);
  if (v2.success) return v2.data;
  const v1 = PromptsV1Schema.safeParse(raw);
  if (v1.success) return migrateV1ToV2(v1.data);
  return null;
}

// Back-compat alias so older callsites keep compiling.
export const PromptsSchema = PromptsV2Schema;
export type Prompts = PromptsV2;
