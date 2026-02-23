import { getPineconeIndex } from './client';
import { env } from '../config/env';
import { PINECONE_METADATA_KEYS } from '../config/constants';
// ── Query ─────────────────────────────────────────────────────────────────────
/**
 * "Pinecone Query Store" node:
 * Queries Pinecone with an embedding vector and returns the top-K
 * most relevant chunks above the minimum score threshold.
 */
export async function queryVectors(embeddingVector, options = {}) {
    const index = getPineconeIndex();
    const topK = options.topK ?? env.TOP_K_RESULTS;
    const namespace = options.namespace ?? env.PINECONE_NAMESPACE;
    const minScore = options.minScore ?? env.MIN_CONFIDENCE_SCORE;
    // Build optional metadata filter
    const filter = { ...(options.filter ?? {}) };
    if (options.channelScope) {
        filter[PINECONE_METADATA_KEYS.CHANNEL_SCOPE] = { $eq: options.channelScope };
    }
    const response = await index.namespace(namespace).query({
        vector: embeddingVector,
        topK,
        includeMetadata: true,
        includeValues: false,
        ...(Object.keys(filter).length > 0 ? { filter } : {}),
    });
    const matches = (response.matches ?? [])
        .filter((m) => (m.score ?? 0) >= minScore)
        .map((m) => ({
        id: m.id,
        score: m.score ?? 0,
        text: String(m.metadata?.['text'] ?? ''),
        source: String(m.metadata?.[PINECONE_METADATA_KEYS.SOURCE] ?? ''),
        docId: String(m.metadata?.[PINECONE_METADATA_KEYS.DOC_ID] ?? ''),
        chunkIndex: Number(m.metadata?.[PINECONE_METADATA_KEYS.CHUNK_INDEX] ?? 0),
        metadata: m.metadata,
    }));
    console.info(`[query] ${matches.length}/${topK} chunks above score ${minScore}`);
    return matches;
}
//# sourceMappingURL=query.js.map