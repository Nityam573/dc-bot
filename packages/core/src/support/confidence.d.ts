import { QueryMatch } from '../pinecone/query';
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'insufficient';
export interface ConfidenceScore {
    score: number;
    level: ConfidenceLevel;
    reason: string;
}
/**
 * Computes a blended confidence score from retrieval quality + LLM self-reported confidence.
 *
 * Weights:
 *   40% top-chunk vector similarity
 *   20% average vector similarity across all chunks
 *   40% LLM self-reported confidence
 */
export declare function computeConfidence(chunks: QueryMatch[], llmConfidence: number): ConfidenceScore;
//# sourceMappingURL=confidence.d.ts.map