/**
 * Multimodal PDF ingestion pipeline.
 *
 * For each page of a support PDF:
 *   1. Render page to PNG (pdfjs-dist + canvas)
 *   2. Run Tesseract OCR → extract raw text
 *   3. Run Gemini vision → caption UI context
 *   4. If OCR is empty/too short → use Gemini visionOCR as fallback
 *   5. Extract error signatures from OCR
 *   6. Compute image SHA-256 hash (dedup key)
 *   7. Build structured document block (TITLE / ERROR_SIGNATURE / OCR / CAPTION / CAUSE / RESOLUTION / TAGS)
 *   8. Chunk the structured block
 *   9. Embed chunks with Gemini
 *  10. Upsert to Pinecone with rich metadata
 *
 * IDs are deterministic: sha256(pdfContent)#page<N>#chunk<M>
 * → re-ingesting the same PDF is idempotent (Pinecone upsert overwrites).
 */
import path from 'path';
import fs from 'fs';
import { createHash } from 'crypto';

import {
  env,
  loadPdf,
  normalizeText,
  chunkText,
  embedBatch,
  upsertVectors,
  getPineconeIndex,
  PINECONE_METADATA_KEYS,
  renderPdfPages,
  runOCR,
  captionImage,
  visionOCR,
  extractErrorSignatures,
  hashImage,
  extractPdfFields,
  buildSupportDocPage,
  type ChunkVector,
} from '@app/core';

import type { IngestPdfMultimodalPayload } from '../queue/types.js';

// ── Result ────────────────────────────────────────────────────────────────────

export interface IngestPdfMultimodalResult {
  docId:           string;
  fileName:        string;
  pagesProcessed:  number;
  chunksCreated:   number;
  vectorsUpserted: number;
  durationMs:      number;
  skippedPages:    number[];  // pages skipped due to duplicate imageHash
}

// ── Main job handler ──────────────────────────────────────────────────────────

export async function ingestPdfMultimodal(
  payload: IngestPdfMultimodalPayload,
): Promise<IngestPdfMultimodalResult> {
  const t0 = Date.now();
  const { filePath, channelScope, productArea, forceReindex = false } = payload;

  if (!fs.existsSync(filePath)) {
    throw new Error(`[ingest-multimodal] File not found: ${filePath}`);
  }
  if (path.extname(filePath).toLowerCase() !== '.pdf') {
    throw new Error(`[ingest-multimodal] Only PDF files are supported; got: ${filePath}`);
  }

  const fileName = path.basename(filePath);
  console.info(`[ingest-multimodal] Starting: ${fileName}`);

  // ── 1. Deterministic docId (hash of file content) ──────────────────────────
  const pdfBuffer  = fs.readFileSync(filePath);
  const docId      = createHash('sha256').update(pdfBuffer).digest('hex').slice(0, 16);
  const ingestedAt = new Date().toISOString();

  // ── 2. Extract full PDF text + structured fields ────────────────────────────
  console.info('[ingest-multimodal] Extracting PDF text and structured fields...');
  const rawText   = await loadPdf(filePath);
  const cleanText = normalizeText(rawText);
  const fields    = await extractPdfFields(cleanText);

  console.info(
    `[ingest-multimodal] Fields extracted — title="${fields.title.slice(0, 60)}" ` +
    `productArea="${fields.productArea || productArea || 'unknown'}"`,
  );

  // ── 3. Render pages to PNG ──────────────────────────────────────────────────
  console.info('[ingest-multimodal] Rendering PDF pages...');
  const renderedPages = await renderPdfPages(filePath, 2.0);
  console.info(`[ingest-multimodal] Rendered ${renderedPages.length} pages`);

  // ── 4. Per-page vision analysis ────────────────────────────────────────────
  const allVectors:     ChunkVector[] = [];
  const skippedPages:   number[]      = [];
  let   totalChunks                   = 0;

  for (const renderedPage of renderedPages) {
    const { pageNumber, imageBuffer } = renderedPage;
    console.info(`[ingest-multimodal] Processing page ${pageNumber}/${renderedPages.length}...`);

    // 4a. Compute image hash for deduplication
    const imageHash = hashImage(imageBuffer);

    // 4b. Skip if this page was already ingested and forceReindex is false
    if (!forceReindex) {
      const existing = await checkImageHashExists(imageHash);
      if (existing) {
        console.info(`[ingest-multimodal] Page ${pageNumber} already indexed (hash=${imageHash.slice(0, 12)}…) — skipping`);
        skippedPages.push(pageNumber);
        continue;
      }
    }

    // 4c. Tesseract OCR
    let ocrText = await runOCR(imageBuffer);

    // 4d. Gemini vision caption
    const caption = await captionImage(imageBuffer, 'image/png');

    // 4e. OCR fallback: if Tesseract returned too little text, use Gemini OCR
    if (ocrText.length < 30 && caption) {
      console.info(`[ingest-multimodal] Page ${pageNumber}: short OCR (${ocrText.length} chars) — using Gemini visionOCR fallback`);
      const fallbackOcr = await visionOCR(imageBuffer, 'image/png');
      if (fallbackOcr.length > ocrText.length) ocrText = fallbackOcr;
    }

    // 4f. Extract error signatures from combined OCR
    const errorSignatures = extractErrorSignatures(ocrText);

    // 4g. Build structured document block
    const docPage = buildSupportDocPage(fields, {
      pageNumber,
      ocrText,
      caption,
      errorSignatures,
      imageHash,
    });

    // ── 5. Chunk the structured block ─────────────────────────────────────
    const chunks = chunkText(docPage.structuredText, { chunkSize: 768, overlap: 96 });
    totalChunks += chunks.length;

    // ── 6. Embed ──────────────────────────────────────────────────────────
    const embeddings = await embedBatch(chunks.map((c) => c.text));

    // ── 7. Build vectors ──────────────────────────────────────────────────
    const effectiveProductArea = fields.productArea || productArea || '';
    const tags = [
      ...fields.tags,
      ...(productArea ? [productArea.toLowerCase()] : []),
    ];

    const vectors: ChunkVector[] = chunks.map((chunk, i) => ({
      // Deterministic ID: docId (= pdf hash) + page + chunk
      id:     `${docId}#page${pageNumber}#chunk${chunk.index}`,
      values: embeddings[i],
      metadata: {
        [PINECONE_METADATA_KEYS.DOC_ID]:          docId,
        [PINECONE_METADATA_KEYS.SOURCE]:          filePath,
        [PINECONE_METADATA_KEYS.FILE_NAME]:       fileName,
        [PINECONE_METADATA_KEYS.FILE_TYPE]:       'pdf',
        [PINECONE_METADATA_KEYS.CHUNK_INDEX]:     chunk.index,
        [PINECONE_METADATA_KEYS.TOTAL_CHUNKS]:    chunks.length,
        [PINECONE_METADATA_KEYS.NAMESPACE]:       env.PINECONE_NAMESPACE,
        [PINECONE_METADATA_KEYS.VERSION]:         '1',
        [PINECONE_METADATA_KEYS.TAGS]:            tags,
        [PINECONE_METADATA_KEYS.INGESTED_AT]:     ingestedAt,
        text:                                     chunk.text,
        // Multimodal fields
        [PINECONE_METADATA_KEYS.PAGE_NUMBER]:     pageNumber,
        [PINECONE_METADATA_KEYS.TOTAL_PAGES]:     renderedPages.length,
        [PINECONE_METADATA_KEYS.ERROR_SIGNATURE]: JSON.stringify(docPage.errorSignatures),
        [PINECONE_METADATA_KEYS.IMAGE_HASH]:      imageHash,
        [PINECONE_METADATA_KEYS.SOURCE_PDF]:      fileName,
        [PINECONE_METADATA_KEYS.HAS_IMAGE]:       true,
        ...(effectiveProductArea
          ? { [PINECONE_METADATA_KEYS.PRODUCT_AREA]: effectiveProductArea }
          : {}),
        ...(channelScope ? { channelScope } : {}),
      },
    }));

    allVectors.push(...vectors);

    console.info(
      `[ingest-multimodal] Page ${pageNumber}: ocr=${ocrText.length}chars ` +
      `capt=${caption.length}chars sigs=${errorSignatures.length} chunks=${chunks.length}`,
    );
  }

  // ── 8. Upsert all vectors ─────────────────────────────────────────────────
  const { upsertedCount } = await upsertVectors(allVectors);
  const durationMs = Date.now() - t0;

  console.info(
    `[ingest-multimodal] ✅ ${fileName}: ${upsertedCount} vectors from ` +
    `${renderedPages.length - skippedPages.length} pages in ${durationMs}ms ` +
    `(${skippedPages.length} pages skipped as duplicates)`,
  );

  return {
    docId,
    fileName,
    pagesProcessed:  renderedPages.length - skippedPages.length,
    chunksCreated:   totalChunks,
    vectorsUpserted: upsertedCount,
    durationMs,
    skippedPages,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Queries Pinecone to check whether any vector with this imageHash already exists.
 * Uses a dummy zero-vector query with a metadata filter — a lightweight existence check.
 */
async function checkImageHashExists(imageHash: string): Promise<boolean> {
  try {
    const index = getPineconeIndex();

    // Zero vector of the right dimension
    const zeroVec = new Array(3072).fill(0) as number[];

    const result = await index.namespace(env.PINECONE_NAMESPACE).query({
      vector:          zeroVec,
      topK:            1,
      includeMetadata: false,
      includeValues:   false,
      filter:          { [PINECONE_METADATA_KEYS.IMAGE_HASH]: { $eq: imageHash } },
    });

    return (result.matches?.length ?? 0) > 0;
  } catch {
    // On error, assume not exists — we'd rather re-ingest than silently skip
    return false;
  }
}
