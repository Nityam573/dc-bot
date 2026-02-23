import { env } from '../config/env.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Chunk {
  text:      string;
  index:     number;
  startChar: number;
  endChar:   number;
}

// ── Main chunker ──────────────────────────────────────────────────────────────

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
export function chunkText(
  text: string,
  overrides?: { chunkSize?: number; overlap?: number },
): Chunk[] {
  const chunkSize = overrides?.chunkSize ?? env.CHUNK_SIZE;
  const overlap   = overrides?.overlap   ?? env.CHUNK_OVERLAP;

  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!normalized) return [];

  const paragraphs  = splitIntoParagraphs(normalized);
  const rawChunks: string[] = [];
  let buffer = '';

  for (const para of paragraphs) {
    if (buffer.length + para.length + 2 <= chunkSize) {
      buffer = buffer ? `${buffer}\n\n${para}` : para;
    } else {
      if (buffer) rawChunks.push(buffer);

      if (para.length > chunkSize) {
        // paragraph too large — split by sentences
        const sentences = splitIntoSentences(para);
        let sentBuffer = '';
        for (const sent of sentences) {
          if (sentBuffer.length + sent.length + 1 <= chunkSize) {
            sentBuffer = sentBuffer ? `${sentBuffer} ${sent}` : sent;
          } else {
            if (sentBuffer) rawChunks.push(sentBuffer);
            sentBuffer = sent.length > chunkSize ? sent.slice(0, chunkSize) : sent;
          }
        }
        if (sentBuffer) rawChunks.push(sentBuffer);
        buffer = '';
      } else {
        buffer = para;
      }
    }
  }
  if (buffer) rawChunks.push(buffer);

  // Apply overlap
  const chunks: Chunk[] = [];
  let charOffset = 0;

  for (let i = 0; i < rawChunks.length; i++) {
    const prefix = i > 0 ? rawChunks[i - 1].slice(-overlap) : '';
    const text   = prefix ? `${prefix} ${rawChunks[i]}` : rawChunks[i];
    chunks.push({
      text,
      index:     i,
      startChar: charOffset,
      endChar:   charOffset + rawChunks[i].length,
    });
    charOffset += rawChunks[i].length + 2;
  }

  return chunks;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function splitIntoParagraphs(text: string): string[] {
  return text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
}

function splitIntoSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).filter(Boolean);
}