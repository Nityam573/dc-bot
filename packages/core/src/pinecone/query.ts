import { getPineconeIndex } from './client.js';
import { env } from '../config/env.js';
import { PINECONE_METADATA_KEYS } from '../config/constants.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QueryMatch {
  id:          string;
  score:       number;
  text:        string;
  source:      string;
  docId:       string;
  chunkIndex:  number;
  metadata:    Record<string, unknown>;
}

export interface QueryOptions {
  topK?:         number;
  namespace?:    string;
  channelScope?: string;
  minScore?:     number;
  filter?:       Record<string, unknown>;
}

// ── Query ─────────────────────────────────────────────────────────────────────

/**
 * "Pinecone Query Store" node:
 * Queries Pinecone with an embedding vector and returns the top-K
 * most relevant chunks above the minimum score threshold.
 */
export async function queryVectors(
  embeddingVector: number[],
  options: QueryOptions = {},
): Promise<QueryMatch[]> {
  const index     = getPineconeIndex();
  const topK      = options.topK      ?? env.TOP_K_RESULTS;
  const namespace = options.namespace ?? env.PINECONE_NAMESPACE;
  const minScore  = options.minScore  ?? env.MIN_CONFIDENCE_SCORE;

  // Build optional metadata filter
  const filter: Record<string, unknown> = { ...(options.filter ?? {}) };
  if (options.channelScope) {
    filter[PINECONE_METADATA_KEYS.CHANNEL_SCOPE] = { $eq: options.channelScope };
  }
  console.info(`[query] Querying index=${env.PINECONE_INDEX} namespace=${namespace} topK=${topK}`);
  
  const response = await index.namespace(namespace).query({
    vector:           embeddingVector,
    topK,
    includeMetadata:  true,
    includeValues:    false,
    ...(Object.keys(filter).length > 0 ? { filter } : {}),
  });

  const matches = (response.matches ?? [])
    .filter((m) => (m.score ?? 0) >= minScore)
    .map((m): QueryMatch => ({
      id:         m.id,
      score:      m.score ?? 0,
      text:       String(m.metadata?.['text'] ?? ''),
      source:     String(m.metadata?.[PINECONE_METADATA_KEYS.SOURCE]      ?? ''),
      docId:      String(m.metadata?.[PINECONE_METADATA_KEYS.DOC_ID]       ?? ''),
      chunkIndex: Number(m.metadata?.[PINECONE_METADATA_KEYS.CHUNK_INDEX]  ?? 0),
      metadata:   m.metadata as Record<string, unknown>,
    }));
  
  console.info(`[query] ${matches.length}/${topK} chunks above score ${minScore}`);
  console.info(`[query] Raw scores: ${(response.matches ?? []).map(m => m.score?.toFixed(3)).join(', ')}`);
  console.info(`[query] Min score filter: ${minScore}`);
  return matches;
}