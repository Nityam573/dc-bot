// ── Pinecone ─────────────────────────────────────────────────────────────────

export const EMBEDDING_DIMENSIONS = 3072; // text-embedding-004

export const PINECONE_METADATA_KEYS = {
  DOC_ID:          'docId',
  SOURCE:          'source',
  FILE_NAME:       'fileName',
  FILE_TYPE:       'fileType',
  CHUNK_INDEX:     'chunkIndex',
  TOTAL_CHUNKS:    'totalChunks',
  NAMESPACE:       'namespace',
  CHANNEL_SCOPE:   'channelScope',
  VERSION:         'version',
  TAGS:            'tags',
  INGESTED_AT:     'ingestedAt',
  // ── Multimodal / PDF page fields ─────────────────────────────────────────
  PAGE_NUMBER:     'pageNumber',
  TOTAL_PAGES:     'totalPages',
  ERROR_SIGNATURE: 'errorSignature',  // JSON-serialized string[]
  PRODUCT_AREA:    'productArea',
  IMAGE_HASH:      'imageHash',       // SHA-256 of page PNG — dedup key
  SOURCE_PDF:      'sourcePdf',       // original PDF filename
  HAS_IMAGE:       'hasImage',        // true for chunks from rendered pages
} as const;

// ── Documents ─────────────────────────────────────────────────────────────────

export const SUPPORTED_FILE_TYPES = ['pdf', 'md', 'html', 'txt'] as const;
export type SupportedFileType = (typeof SUPPORTED_FILE_TYPES)[number];

// ── Confidence ────────────────────────────────────────────────────────────────

export const CONFIDENCE_THRESHOLDS = {
  HIGH:   0.85,
  MEDIUM: 0.70,
  LOW:    0.50,
} as const;

// ── Discord ───────────────────────────────────────────────────────────────────

export const MAX_DISCORD_MESSAGE_LENGTH = 2000;

// ── RAG ───────────────────────────────────────────────────────────────────────

export const MAX_CONTEXT_CHUNKS   = 5;
export const SYSTEM_PROMPT_VERSION = '1.0.0';