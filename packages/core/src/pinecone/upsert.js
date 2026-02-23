import { getPineconeIndex } from './client';
import { env } from '../config/env';
import { PINECONE_METADATA_KEYS } from '../config/constants';
// ── Upsert ────────────────────────────────────────────────────────────────────
const BATCH_SIZE = 100; // Pinecone recommended batch limit
/**
 * "Pinecone Upload Store" node:
 * Upserts embedded chunk vectors into Pinecone in safe batches.
 */
export async function upsertVectors(vectors) {
    if (vectors.length === 0)
        return { upsertedCount: 0 };
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
export async function deleteDocumentVectors(docId) {
    const index = getPineconeIndex();
    await index.namespace(env.PINECONE_NAMESPACE).deleteMany({
        filter: { [PINECONE_METADATA_KEYS.DOC_ID]: { $eq: docId } },
    });
    console.info(`[upsert] Deleted vectors for docId=${docId}`);
}
//# sourceMappingURL=upsert.js.map