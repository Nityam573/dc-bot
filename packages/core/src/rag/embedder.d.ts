/**
 * "Embeddings Google Gemini1" node:
 * Embeds a single string using Gemini text-embedding-004.
 * Used at both ingest time (chunks) and query time (user message).
 */
export declare function embedText(text: string): Promise<number[]>;
/**
 * Batch embed multiple texts with a concurrency limit to avoid rate limits.
 * Gemini doesn't have a native batch endpoint, so we fan-out requests.
 */
export declare function embedBatch(texts: string[], concurrency?: number): Promise<number[][]>;
//# sourceMappingURL=embedder.d.ts.map