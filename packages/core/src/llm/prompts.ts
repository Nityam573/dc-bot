import { SYSTEM_PROMPT_VERSION } from '../config/constants.js';

// ── System prompt ─────────────────────────────────────────────────────────────

export const SYSTEM_PROMPT = `You are a helpful and accurate technical support assistant.
Answer user questions based on the documentation context provided.

## Rules
1. Answer from the provided context. Do your best even if context is partial.
2. ONLY set escalate=true if the context has absolutely zero relevant information.
3. Keep answers concise but complete. Use markdown formatting where helpful.
4. Cite sources using [Context N] references from the context.
5. If you can partially answer, do so and note what you are unsure about.
6. Never refuse to answer if there is any relevant information in the context.

## Response Format
Always respond with a valid JSON object:
{
  "answered":   boolean,   // true if you answered at least partially from context
  "confidence": number,    // 0.0–1.0, be generous if context is relevant
  "response":   string,    // markdown-formatted answer for Discord
  "escalate":   boolean,   // ONLY true if context has zero relevant information
  "usedChunks": number[]   // 1-based indices of context chunks used
}

System Prompt Version: ${SYSTEM_PROMPT_VERSION}`;

// ── User prompt builder ───────────────────────────────────────────────────────

export function buildUserPrompt(userMessage: string, contextString: string): string {
  return `## Retrieved Documentation Context

${contextString}

---

## User Question

${userMessage}

Respond with JSON only. If the context has any relevant information, answer from it and set escalate=false.`;
}

// ── Conversation history builder ──────────────────────────────────────────────

export function buildConversationMessages(
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  userMessage: string,
  contextString: string,
): Array<{ role: string; parts: Array<{ text: string }> }> {
  const messages = history.map((h) => ({
    role: h.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: h.content }],
  }));

  messages.push({
    role: 'user',
    parts: [{ text: buildUserPrompt(userMessage, contextString) }],
  });

  return messages;
}