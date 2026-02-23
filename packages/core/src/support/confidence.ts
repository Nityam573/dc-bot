import { QueryMatch } from '../pinecone/query.js';
import { CONFIDENCE_THRESHOLDS } from '../config/constants.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'insufficient';

export interface ConfidenceScore {
  score:  number;
  level:  ConfidenceLevel;
  reason: string;
}

// ── Scorer ────────────────────────────────────────────────────────────────────

/**
 * Computes a blended confidence score from retrieval quality + LLM self-reported confidence.
 *
 * Weights:
 *   40% top-chunk vector similarity
 *   20% average vector similarity across all chunks
 *   40% LLM self-reported confidence
 */
export function computeConfidence(
  chunks:        QueryMatch[],
  llmConfidence: number,
): ConfidenceScore {
  if (chunks.length === 0) {
    return {
      score:  0,
      level:  'insufficient',
      reason: 'No relevant context found in documentation.',
    };
  }

  const topScore = chunks[0]?.score ?? 0;
  const avgScore = chunks.reduce((sum, c) => sum + c.score, 0) / chunks.length;
  const score    = Math.round((topScore * 0.4 + avgScore * 0.2 + llmConfidence * 0.4) * 100) / 100;

  let level:  ConfidenceLevel;
  let reason: string;

  if (score >= CONFIDENCE_THRESHOLDS.HIGH) {
    level  = 'high';
    reason = 'Strong documentation match found.';
  } else if (score >= CONFIDENCE_THRESHOLDS.MEDIUM) {
    level  = 'medium';
    reason = 'Moderate match. Answer may be partial.';
  } else if (score >= CONFIDENCE_THRESHOLDS.LOW) {
    level  = 'low';
    reason = 'Weak match. Consider escalating to a human.';
  } else {
    level  = 'insufficient';
    reason = 'Insufficient context. Escalating to human support.';
  }

  return { score, level, reason };
}