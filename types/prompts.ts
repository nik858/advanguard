import { z } from "zod";

export const PromptsSchema = z.object({
  version: z.number().default(1),
  system_prompt: z.string(),
  email_1_template: z.string(),
});

export type Prompts = z.infer<typeof PromptsSchema>;
