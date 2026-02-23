// ── Queue name ────────────────────────────────────────────────────────────────

export const QUEUE_NAME = 'document-ingestion' as const;

// ── Job names ─────────────────────────────────────────────────────────────────

export type JobName = 'ingest-document' | 'ingest-pdf-multimodal' | 'reindex-namespace';

// ── Job payloads ──────────────────────────────────────────────────────────────

export interface IngestDocumentPayload {
  filePath:          string;
  channelScope?:     string;       // restrict doc to a specific Discord channel
  reindex?:          boolean;      // delete old vectors before re-ingesting
  metadataOverrides?: {
    version?:        string;
    tags?:           string[];
    channelScope?:   string;
  };
}

export interface ReindexNamespacePayload {
  sourceDirectory: string;         // local folder of docs to reindex
  namespace?:      string;         // Pinecone namespace to target
}

export interface IngestPdfMultimodalPayload {
  filePath:       string;          // absolute path to the PDF
  channelScope?:  string;          // restrict to a specific Discord channel
  productArea?:   string;          // e.g. 'issuer-node', 'vault', 'api'
  forceReindex?:  boolean;         // re-ingest pages even if imageHash already exists
}

// ── Union type used by the worker switch ──────────────────────────────────────

export type JobPayload =
  | { name: 'ingest-document';       data: IngestDocumentPayload }
  | { name: 'ingest-pdf-multimodal'; data: IngestPdfMultimodalPayload }
  | { name: 'reindex-namespace';     data: ReindexNamespacePayload };