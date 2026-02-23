export declare const EMBEDDING_DIMENSIONS = 3072;
export declare const PINECONE_METADATA_KEYS: {
    readonly DOC_ID: "docId";
    readonly SOURCE: "source";
    readonly FILE_NAME: "fileName";
    readonly FILE_TYPE: "fileType";
    readonly CHUNK_INDEX: "chunkIndex";
    readonly TOTAL_CHUNKS: "totalChunks";
    readonly NAMESPACE: "namespace";
    readonly CHANNEL_SCOPE: "channelScope";
    readonly VERSION: "version";
    readonly TAGS: "tags";
    readonly INGESTED_AT: "ingestedAt";
};
export declare const SUPPORTED_FILE_TYPES: readonly ["pdf", "md", "html", "txt"];
export type SupportedFileType = (typeof SUPPORTED_FILE_TYPES)[number];
export declare const CONFIDENCE_THRESHOLDS: {
    readonly HIGH: 0.85;
    readonly MEDIUM: 0.7;
    readonly LOW: 0.5;
};
export declare const MAX_DISCORD_MESSAGE_LENGTH = 2000;
export declare const MAX_CONTEXT_CHUNKS = 5;
export declare const SYSTEM_PROMPT_VERSION = "1.0.0";
//# sourceMappingURL=constants.d.ts.map