export declare const QUEUE_NAME: "document-ingestion";
export type JobName = 'ingest-document' | 'reindex-namespace';
export interface IngestDocumentPayload {
    filePath: string;
    channelScope?: string;
    reindex?: boolean;
    metadataOverrides?: {
        version?: string;
        tags?: string[];
        channelScope?: string;
    };
}
export interface ReindexNamespacePayload {
    sourceDirectory: string;
    namespace?: string;
}
export type JobPayload = {
    name: 'ingest-document';
    data: IngestDocumentPayload;
} | {
    name: 'reindex-namespace';
    data: ReindexNamespacePayload;
};
//# sourceMappingURL=types.d.ts.map