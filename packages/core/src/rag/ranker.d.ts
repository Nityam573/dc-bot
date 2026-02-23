import { QueryMatch } from '../pinecone/query';
/**
 * Lightweight heuristic re-ranker applied after Pinecone vector search.
 *
 * Boosts chunks where:
 *   - Query keywords appear in the chunk text (keyword overlap)
 *   - The chunk is from the start of its source document (likely intro/definition)
 *
 * This is a cheap cross-encoder substitute until query volume justifies the cost
 * of a dedicated reranking model (e.g. Cohere Rerank).
 */
export declare function rerankChunks(chunks: QueryMatch[], query: string): QueryMatch[];
//# sourceMappingURL=ranker.d.ts.map