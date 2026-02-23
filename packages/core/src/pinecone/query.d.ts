export interface QueryMatch {
    id: string;
    score: number;
    text: string;
    source: string;
    docId: string;
    chunkIndex: number;
    metadata: Record<string, unknown>;
}
export interface QueryOptions {
    topK?: number;
    namespace?: string;
    channelScope?: string;
    minScore?: number;
    filter?: Record<string, unknown>;
}
/**
 * "Pinecone Query Store" node:
 * Queries Pinecone with an embedding vector and returns the top-K
 * most relevant chunks above the minimum score threshold.
 */
export declare function queryVectors(embeddingVector: number[], options?: QueryOptions): Promise<QueryMatch[]>;
//# sourceMappingURL=query.d.ts.map