import type { IngestDocumentPayload } from '../queue/types.js';
export interface IngestResult {
    docId: string;
    fileName: string;
    chunksCreated: number;
    vectorsUpserted: number;
    durationMs: number;
}
/**
 * "Default Data Loader" node:
 * Full document ingestion pipeline:
 *   filePath → load → normalize → chunk → embed → upsert into Pinecone
 */
export declare function ingestDocument(payload: IngestDocumentPayload): Promise<IngestResult>;
//# sourceMappingURL=ingestDocument.d.ts.map