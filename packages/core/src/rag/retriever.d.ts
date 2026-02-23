import { QueryMatch, QueryOptions } from '../pinecone/query';
export interface RetrievalResult {
    chunks: QueryMatch[];
    query: string;
    embeddingMs: number;
    queryMs: number;
}
/**
 * Orchestrates the full retrieval step:
 *   1. Embed the user query with Gemini
 *   2. Query Pinecone for the closest vectors
 *   3. Return matches + timing metadata
 */
export declare function retrieveRelevantChunks(userQuery: string, options?: QueryOptions): Promise<RetrievalResult>;
/**
 * Formats retrieved chunks into a numbered context string for the LLM prompt.
 */
export declare function buildContextString(chunks: QueryMatch[]): string;
//# sourceMappingURL=retriever.d.ts.map