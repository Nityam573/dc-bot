import { embedText } from './embedder';
import { queryVectors } from '../pinecone/query';
// ── Retriever ─────────────────────────────────────────────────────────────────
/**
 * Orchestrates the full retrieval step:
 *   1. Embed the user query with Gemini
 *   2. Query Pinecone for the closest vectors
 *   3. Return matches + timing metadata
 */
export async function retrieveRelevantChunks(userQuery, options = {}) {
    const t0 = Date.now();
    const embedding = await embedText(userQuery);
    const embeddingMs = Date.now() - t0;
    const t1 = Date.now();
    const chunks = await queryVectors(embedding, options);
    const queryMs = Date.now() - t1;
    return { chunks, query: userQuery, embeddingMs, queryMs };
}
// ── Context builder ───────────────────────────────────────────────────────────
/**
 * Formats retrieved chunks into a numbered context string for the LLM prompt.
 */
export function buildContextString(chunks) {
    if (chunks.length === 0)
        return 'No relevant documentation found.';
    return chunks
        .map((c, i) => {
        const source = c.source ? ` (source: ${c.source})` : '';
        return `[Context ${i + 1}]${source}\n${c.text}`;
    })
        .join('\n\n---\n\n');
}
//# sourceMappingURL=retriever.js.map