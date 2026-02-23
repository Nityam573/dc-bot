import { PINECONE_METADATA_KEYS } from '../config/constants';
export interface ChunkVector {
    id: string;
    values: number[];
    metadata: {
        [PINECONE_METADATA_KEYS.DOC_ID]: string;
        [PINECONE_METADATA_KEYS.SOURCE]: string;
        [PINECONE_METADATA_KEYS.FILE_NAME]: string;
        [PINECONE_METADATA_KEYS.FILE_TYPE]: string;
        [PINECONE_METADATA_KEYS.CHUNK_INDEX]: number;
        [PINECONE_METADATA_KEYS.TOTAL_CHUNKS]: number;
        [PINECONE_METADATA_KEYS.NAMESPACE]: string;
        [PINECONE_METADATA_KEYS.VERSION]: string;
        [PINECONE_METADATA_KEYS.TAGS]: string[];
        [PINECONE_METADATA_KEYS.INGESTED_AT]: string;
        text: string;
        channelScope?: string;
    };
}
/**
 * "Pinecone Upload Store" node:
 * Upserts embedded chunk vectors into Pinecone in safe batches.
 */
export declare function upsertVectors(vectors: ChunkVector[]): Promise<{
    upsertedCount: number;
}>;
/**
 * Deletes all vectors belonging to a document (used before re-indexing).
 */
export declare function deleteDocumentVectors(docId: string): Promise<void>;
//# sourceMappingURL=upsert.d.ts.map