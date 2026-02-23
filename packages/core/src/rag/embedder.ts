import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';

// ── Singleton client ──────────────────────────────────────────────────────────

let _genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!_genAI) _genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  return _genAI;
}

// ── Single text embedding ─────────────────────────────────────────────────────

/**
 * "Embeddings Google Gemini1" node:
 * Embeds a single string using Gemini text-embedding-004.
 * Used at both ingest time (chunks) and query time (user message).
 */
export async function embedText(text: string): Promise<number[]> {
  const model  = getGenAI().getGenerativeModel({ model: env.GEMINI_EMBEDDING_MODEL });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

// ── Batch embedding ───────────────────────────────────────────────────────────

/**
 * Batch embed multiple texts with a concurrency limit to avoid rate limits.
 * Gemini doesn't have a native batch endpoint, so we fan-out requests.
 */
export async function embedBatch(texts: string[], concurrency = 5): Promise<number[][]> {
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += concurrency) {
    const slice = texts.slice(i, i + concurrency);
    const batch = await Promise.all(slice.map(embedText));
    results.push(...batch);
  }

  return results;
}