import path from 'path';
import { env, loadPdf, loadMarkdown, loadHtml, loadText, normalizeText, buildDocumentMetadata, chunkText, embedBatch, upsertVectors, deleteDocumentVectors, PINECONE_METADATA_KEYS, } from '@app/core';
// ── Main job handler ──────────────────────────────────────────────────────────
/**
 * "Default Data Loader" node:
 * Full document ingestion pipeline:
 *   filePath → load → normalize → chunk → embed → upsert into Pinecone
 */
export async function ingestDocument(payload) {
    const t0 = Date.now();
    const { filePath, reindex = false, metadataOverrides = {} } = payload;
    // ── 1. Load raw text ───────────────────────────────────────────────────────
    const ext = path.extname(filePath).slice(1).toLowerCase();
    let rawText;
    switch (ext) {
        case 'pdf':
            rawText = await loadPdf(filePath);
            break;
        case 'md':
            rawText = loadMarkdown(filePath);
            break;
        case 'html':
            rawText = loadHtml(filePath);
            break;
        case 'txt':
            rawText = loadText(filePath);
            break;
        default:
            throw new Error(`Unsupported file type: .${ext}`);
    }
    // ── 2. Normalize ───────────────────────────────────────────────────────────
    const cleanText = normalizeText(rawText);
    if (!cleanText)
        throw new Error(`Document empty after normalization: ${filePath}`);
    // ── 3. Build metadata ──────────────────────────────────────────────────────
    const metadata = buildDocumentMetadata(filePath, {
        ...metadataOverrides,
        ...(payload.channelScope ? { channelScope: payload.channelScope } : {}),
    });
    // ── 4. Delete old vectors if re-indexing ───────────────────────────────────
    if (reindex) {
        await deleteDocumentVectors(metadata.docId);
        console.info(`[ingest] Deleted old vectors for docId=${metadata.docId}`);
    }
    // ── 5. Chunk ───────────────────────────────────────────────────────────────
    const chunks = chunkText(cleanText);
    console.info(`[ingest] ${metadata.fileName}: ${chunks.length} chunks created`);
    // ── 6. Embed ───────────────────────────────────────────────────────────────
    const embeddings = await embedBatch(chunks.map((c) => c.text));
    // ── 7. Build vectors ───────────────────────────────────────────────────────
    const vectors = chunks.map((chunk, i) => ({
        id: `${metadata.docId}#${chunk.index}`,
        values: embeddings[i],
        metadata: {
            [PINECONE_METADATA_KEYS.DOC_ID]: metadata.docId,
            [PINECONE_METADATA_KEYS.SOURCE]: metadata.source,
            [PINECONE_METADATA_KEYS.FILE_NAME]: metadata.fileName,
            [PINECONE_METADATA_KEYS.FILE_TYPE]: metadata.fileType,
            [PINECONE_METADATA_KEYS.CHUNK_INDEX]: chunk.index,
            [PINECONE_METADATA_KEYS.TOTAL_CHUNKS]: chunks.length,
            [PINECONE_METADATA_KEYS.NAMESPACE]: env.PINECONE_NAMESPACE,
            [PINECONE_METADATA_KEYS.VERSION]: metadata.version,
            [PINECONE_METADATA_KEYS.TAGS]: metadata.tags,
            [PINECONE_METADATA_KEYS.INGESTED_AT]: metadata.ingestedAt,
            text: chunk.text,
            ...(metadata.channelScope ? { channelScope: metadata.channelScope } : {}),
        },
    }));
    // ── 8. Upsert into Pinecone ────────────────────────────────────────────────
    const { upsertedCount } = await upsertVectors(vectors);
    const durationMs = Date.now() - t0;
    console.info(`[ingest] ✅ ${metadata.fileName}: ${upsertedCount} vectors upserted in ${durationMs}ms`);
    return {
        docId: metadata.docId,
        fileName: metadata.fileName,
        chunksCreated: chunks.length,
        vectorsUpserted: upsertedCount,
        durationMs,
    };
}
//# sourceMappingURL=ingestDocument.js.map