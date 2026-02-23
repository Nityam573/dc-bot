import { Pinecone } from '@pinecone-database/pinecone';
import { env } from '../config/env.js';

// ── Singleton client ──────────────────────────────────────────────────────────

let _client: Pinecone | null = null;

export function getPineconeClient(): Pinecone {
  if (!_client) {
    _client = new Pinecone({ apiKey: env.PINECONE_API_KEY });
  }
  return _client;
}

/**
 * Returns the configured Pinecone index.
 * Use this everywhere instead of calling getPineconeClient().Index() manually.
 */
export function getPineconeIndex() {
  return getPineconeClient().Index(env.PINECONE_INDEX);
}