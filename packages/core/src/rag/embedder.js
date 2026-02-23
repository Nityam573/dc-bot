import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env';
// ── Singleton client ──────────────────────────────────────────────────────────
let _genAI = null;
function getGenAI() {
    if (!_genAI)
        _genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    return _genAI;
}
// ── Single text embedding ─────────────────────────────────────────────────────
/**
 * "Embeddings Google Gemini1" node:
 * Embeds a single string using Gemini text-embedding-004.
 * Used at both ingest time (chunks) and query time (user message).
 */
export async function embedText(text) {
    const model = getGenAI().getGenerativeModel({ model: env.GEMINI_EMBEDDING_MODEL });
    const result = await model.embedContent(text);
    return result.embedding.values;
}
// ── Batch embedding ───────────────────────────────────────────────────────────
/**
 * Batch embed multiple texts with a concurrency limit to avoid rate limits.
 * Gemini doesn't have a native batch endpoint, so we fan-out requests.
 */
export async function embedBatch(texts, concurrency = 5) {
    const results = [];
    for (let i = 0; i < texts.length; i += concurrency) {
        const slice = texts.slice(i, i + concurrency);
        const batch = await Promise.all(slice.map(embedText));
        results.push(...batch);
    }
    return results;
}
//# sourceMappingURL=embedder.js.map