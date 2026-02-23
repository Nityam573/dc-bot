import { getPineconeIndex } from './client.js';
import { env } from '../config/env.js';
import { PINECONE_METADATA_KEYS } from '../config/constants.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChunkVector {
  id:     string;
  values: number[];
  metadata: {
    // ── Core fields (always present) ──────────────────────────────────────
    [PINECONE_METADATA_KEYS.DOC_ID]:       string;
    [PINECONE_METADATA_KEYS.SOURCE]:       string;
    [PINECONE_METADATA_KEYS.FILE_NAME]:    string;
    [PINECONE_METADATA_KEYS.FILE_TYPE]:    string;
    [PINECONE_METADATA_KEYS.CHUNK_INDEX]:  number;
    [PINECONE_METADATA_KEYS.TOTAL_CHUNKS]: number;
    [PINECONE_METADATA_KEYS.NAMESPACE]:    string;
    [PINECONE_METADATA_KEYS.VERSION]:      string;
    [PINECONE_METADATA_KEYS.TAGS]:         string[];
    [PINECONE_METADATA_KEYS.INGESTED_AT]:  string;
    text: string;          // raw chunk text — returned at query time

    // ── Optional fields ───────────────────────────────────────────────────
    channelScope?: string;

    // ── Multimodal / PDF-page fields ──────────────────────────────────────
    [PINECONE_METADATA_KEYS.PAGE_NUMBER]?:     number;
    [PINECONE_METADATA_KEYS.TOTAL_PAGES]?:     number;
    [PINECONE_METADATA_KEYS.ERROR_SIGNATURE]?: string;  // JSON string[]
    [PINECONE_METADATA_KEYS.PRODUCT_AREA]?:   string;
    [PINECONE_METADATA_KEYS.IMAGE_HASH]?:      string;
    [PINECONE_METADATA_KEYS.SOURCE_PDF]?:      string;
    [PINECONE_METADATA_KEYS.HAS_IMAGE]?:       boolean;
  };
}

// ── Upsert ────────────────────────────────────────────────────────────────────

const BATCH_SIZE = 100; // Pinecone recommended batch limit

/**
 * "Pinecone Upload Store" node:
 * Upserts embedded chunk vectors into Pinecone in safe batches.
 */
export async function upsertVectors(
  vectors: ChunkVector[],
): Promise<{ upsertedCount: number }> {
  if (vectors.length === 0) return { upsertedCount: 0 };

  const index = getPineconeIndex();
  let upsertedCount = 0;

  for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
    const batch = vectors.slice(i, i + BATCH_SIZE);
    await index.namespace(env.PINECONE_NAMESPACE).upsert(batch);
    upsertedCount += batch.length;
    console.info(`[upsert] Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} vectors`);
  }

  return { upsertedCount };
}

// ── Delete ────────────────────────────────────────────────────────────────────

/**
 * Deletes all vectors belonging to a document (used before re-indexing).
 */
export async function deleteDocumentVectors(docId: string): Promise<void> {
  const index = getPineconeIndex();

  await index.namespace(env.PINECONE_NAMESPACE).deleteMany({
    filter: { [PINECONE_METADATA_KEYS.DOC_ID]: { $eq: docId } },
  });

  console.info(`[upsert] Deleted vectors for docId=${docId}`);
}