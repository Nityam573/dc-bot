export interface Chunk {
    text: string;
    index: number;
    startChar: number;
    endChar: number;
}
/**
 * Splits a document into overlapping text chunks.
 *
 * Strategy (in priority order):
 *   1. Split on paragraph boundaries (double newline)
 *   2. If a paragraph > chunkSize → split on sentence boundaries
 *   3. If a sentence > chunkSize → hard-cut at character limit
 *
 * Overlap: prepend the last N chars of the previous chunk so the LLM
 * always has bridging context across boundaries.
 */
export declare function chunkText(text: string, overrides?: {
    chunkSize?: number;
    overlap?: number;
}): Chunk[];
//# sourceMappingURL=chunker.d.ts.map