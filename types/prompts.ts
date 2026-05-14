import { z } from "zod";

export const PromptsSchema = z.object({
  version: z.number().default(1),
  system_prompt: z.string().min(1),
  email_instructions: z.string().min(1),
  subject_instructions: z.string().min(1),
  tone: z.string().min(1),
  signature: z.string().min(1),
});

export type Prompts = z.infer<typeof PromptsSchema>;
