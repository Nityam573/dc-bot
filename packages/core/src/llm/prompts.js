import { SYSTEM_PROMPT_VERSION } from '../config/constants';
// ── System prompt ─────────────────────────────────────────────────────────────
export const SYSTEM_PROMPT = `You are a helpful and accurate technical support assistant.
Answer user questions based ONLY on the documentation context provided.

## Rules
1. Answer ONLY from the provided context. Never hallucinate or invent information.
2. If context is insufficient, say so clearly and suggest contacting a human agent.
3. Keep answers concise but complete. Use markdown formatting where helpful.
4. Always cite sources using [Context N] references from the context.
5. Do not answer questions unrelated to the product documentation.
6. If unsure, say "I'm not sure based on the available documentation."

## Response Format
Always respond with a valid JSON object:
{
  "answered":   boolean,   // true if answered from context
  "confidence": number,    // 0.0–1.0
  "response":   string,    // markdown-formatted answer for Discord
  "escalate":   boolean,   // true if a human should be notified
  "usedChunks": number[]   // 1-based indices of context chunks used
}

System Prompt Version: ${SYSTEM_PROMPT_VERSION}`;
// ── User prompt builder ───────────────────────────────────────────────────────
export function buildUserPrompt(userMessage, contextString) {
    return `## Retrieved Documentation Context

${contextString}

---

## User Question

${userMessage}

Respond with JSON only.`;
}
// ── Conversation history builder ──────────────────────────────────────────────
export function buildConversationMessages(history, userMessage, contextString) {
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
//# sourceMappingURL=prompts.js.map