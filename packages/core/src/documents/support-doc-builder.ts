/**
 * Builds a structured support document string from per-page analysis results.
 *
 * Output format (one block per page):
 *
 *   TITLE: <title>
 *   ERROR_SIGNATURE: <sig1> | <sig2>
 *   IMAGE_OCR: <ocr text>
 *   IMAGE_CAPTION: <gemini caption>
 *   CAUSE: <cause>
 *   RESOLUTION: <resolution>
 *   TAGS: <tag1>, <tag2>
 *
 * This format is designed to be:
 *   • Human-readable in Pinecone metadata text field
 *   • Structured enough for the retriever to surface specific sections
 *   • Embeddable as a single chunk or split by section
 */

import type { PdfFields } from './pdf-fields-extractor.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PageAnalysis {
  pageNumber:      number;
  ocrText:         string;   // raw Tesseract output (may be '')
  caption:         string;   // Gemini vision description (may be '')
  errorSignatures: string[]; // from error-signature.ts
  imageHash:       string;   // SHA-256 of page PNG
}

export interface SupportDocPage {
  pageNumber:      number;
  structuredText:  string;   // the formatted block — ready to chunk + embed
  errorSignatures: string[];
  imageHash:       string;
}

// ── Builder ───────────────────────────────────────────────────────────────────

/**
 * Assembles a structured support document block for one PDF page.
 *
 * @param fields    - extracted title/cause/resolution from the full PDF text
 * @param page      - per-page vision analysis (OCR + caption + error sigs)
 */
export function buildSupportDocPage(
  fields: PdfFields,
  page:   PageAnalysis,
): SupportDocPage {
  const errorSigLine = page.errorSignatures.length > 0
    ? page.errorSignatures.join(' | ')
    : fields.tags.join(', '); // fallback: use tags as a soft signal

  const lines: string[] = [
    `TITLE: ${fields.title || 'Untitled Support Document'}`,
    `ERROR_SIGNATURE: ${errorSigLine}`,
  ];

  if (page.ocrText) {
    lines.push(`IMAGE_OCR: ${sanitiseSectionText(page.ocrText)}`);
  }

  if (page.caption) {
    lines.push(`IMAGE_CAPTION: ${sanitiseSectionText(page.caption)}`);
  }

  if (fields.cause) {
    lines.push(`CAUSE: ${sanitiseSectionText(fields.cause)}`);
  }

  if (fields.resolution) {
    lines.push(`RESOLUTION: ${sanitiseSectionText(fields.resolution)}`);
  }

  if (fields.tags.length > 0) {
    lines.push(`TAGS: ${fields.tags.join(', ')}`);
  }

  return {
    pageNumber:      page.pageNumber,
    structuredText:  lines.join('\n'),
    errorSignatures: page.errorSignatures,
    imageHash:       page.imageHash,
  };
}

/**
 * Builds a lightweight query document for a Discord image attachment.
 * Used at query time — not ingested, just embedded for retrieval.
 */
export function buildImageQueryText(opts: {
  userMessage:  string;
  ocrText:      string;
  caption:      string;
}): string {
  const parts: string[] = [];

  if (opts.userMessage.trim()) {
    parts.push(`User message: ${opts.userMessage.trim()}`);
  }
  if (opts.ocrText.trim()) {
    parts.push(`OCR: ${opts.ocrText.trim()}`);
  }
  if (opts.caption.trim()) {
    parts.push(`Caption: ${opts.caption.trim()}`);
  }

  return parts.join('\n');
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Collapse excessive whitespace and cap section length. */
function sanitiseSectionText(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, 1500);
}
