// ── Pinecone ─────────────────────────────────────────────────────────────────
export const EMBEDDING_DIMENSIONS = 3072; // text-embedding-004
export const PINECONE_METADATA_KEYS = {
    DOC_ID: 'docId',
    SOURCE: 'source',
    FILE_NAME: 'fileName',
    FILE_TYPE: 'fileType',
    CHUNK_INDEX: 'chunkIndex',
    TOTAL_CHUNKS: 'totalChunks',
    NAMESPACE: 'namespace',
    CHANNEL_SCOPE: 'channelScope',
    VERSION: 'version',
    TAGS: 'tags',
    INGESTED_AT: 'ingestedAt',
};
// ── Documents ─────────────────────────────────────────────────────────────────
export const SUPPORTED_FILE_TYPES = ['pdf', 'md', 'html', 'txt'];
// ── Confidence ────────────────────────────────────────────────────────────────
export const CONFIDENCE_THRESHOLDS = {
    HIGH: 0.85,
    MEDIUM: 0.70,
    LOW: 0.50,
};
// ── Discord ───────────────────────────────────────────────────────────────────
export const MAX_DISCORD_MESSAGE_LENGTH = 2000;
// ── RAG ───────────────────────────────────────────────────────────────────────
export const MAX_CONTEXT_CHUNKS = 5;
export const SYSTEM_PROMPT_VERSION = '1.0.0';
//# sourceMappingURL=constants.js.map