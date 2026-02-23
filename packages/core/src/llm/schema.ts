import { z } from 'zod';

// ── Zod schema for strict LLM output ─────────────────────────────────────────

export const AgentResponseSchema = z.object({
  answered:   z.boolean(),
  confidence: z.number().min(0).max(1),
  response:   z.string().min(1),
  escalate:   z.boolean(),
  usedChunks: z.array(z.number()).default([]),
});

export type AgentResponse = z.infer<typeof AgentResponseSchema>;

// ── Parser ────────────────────────────────────────────────────────────────────

export function parseAgentResponse(raw: string): AgentResponse {
  // Strip markdown code fences if the model wraps JSON in them
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const parsed = JSON.parse(cleaned);
  return AgentResponseSchema.parse(parsed);
}