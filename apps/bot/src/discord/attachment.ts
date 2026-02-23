/**
 * Discord image attachment processing.
 *
 * Downloads an image attachment from Discord's CDN, runs OCR + Gemini
 * caption on it, and returns the enriched query text that the RAG pipeline
 * will embed for retrieval.
 *
 * Supported MIME types: image/png, image/jpeg, image/webp, image/gif
 * (GIFs are treated as the first frame via the PNG buffer returned by Discord)
 */
import type { Message, Attachment } from 'discord.js';
import { runOCR, captionImage, visionOCR, buildImageQueryText } from '@app/core';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AttachmentAnalysis {
  ocrText:     string;
  caption:     string;
  queryText:   string;   // pre-built enriched query string
  attachmentId: string;
  fileName:    string;
}

// ── Supported image types ─────────────────────────────────────────────────────

const SUPPORTED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
]);

/** Returns only image attachments from a Discord message. */
export function getImageAttachments(message: Message): Attachment[] {
  return message.attachments
    .filter((a) => {
      const ct = a.contentType?.split(';')[0].trim().toLowerCase() ?? '';
      return SUPPORTED_IMAGE_TYPES.has(ct) || /\.(png|jpe?g|webp|gif)$/i.test(a.name ?? '');
    })
    .map((a) => a)
    .slice(0, 3); // cap at 3 images per message
}

// ── Downloader ────────────────────────────────────────────────────────────────

async function downloadAttachment(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download attachment: HTTP ${res.status} from ${url}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

// ── Analyser ──────────────────────────────────────────────────────────────────

/**
 * Downloads a single image attachment and runs OCR + vision caption on it.
 * OCR failure falls back to Gemini visionOCR; caption failure returns ''.
 * Never throws — logs warnings and returns empty strings on partial failure.
 */
export async function analyseAttachment(
  attachment: Attachment,
): Promise<AttachmentAnalysis> {
  const mimeType = (
    attachment.contentType?.split(';')[0].trim().toLowerCase() ?? 'image/png'
  ) as 'image/png' | 'image/jpeg' | 'image/webp';

  let imageBuffer: Buffer;
  try {
    imageBuffer = await downloadAttachment(attachment.url);
  } catch (err) {
    console.warn(`[attachment] Could not download ${attachment.id}: ${(err as Error).message}`);
    return { ocrText: '', caption: '', queryText: '', attachmentId: attachment.id, fileName: attachment.name ?? '' };
  }

  // Run OCR and caption in parallel
  const [rawOcr, caption] = await Promise.all([
    runOCR(imageBuffer),
    captionImage(imageBuffer, mimeType),
  ]);

  // Fallback: Gemini visionOCR when Tesseract returns too little
  let ocrText = rawOcr;
  if (ocrText.length < 30) {
    console.info(`[attachment] Short OCR (${ocrText.length} chars) — using Gemini visionOCR`);
    const fallback = await visionOCR(imageBuffer, mimeType);
    if (fallback.length > ocrText.length) ocrText = fallback;
  }

  return {
    ocrText,
    caption,
    queryText:    '',    // filled in by the caller with userMessage
    attachmentId: attachment.id,
    fileName:     attachment.name ?? 'screenshot',
  };
}

/**
 * Processes all image attachments from a message and builds a single
 * enriched query string combining user text + OCR + caption.
 *
 * Returns null when the message has no image attachments.
 */
export async function buildMultimodalQuery(
  message: Message,
  userText: string,
): Promise<{ enrichedQuery: string; analyses: AttachmentAnalysis[] } | null> {
  const attachments = getImageAttachments(message);
  if (attachments.length === 0) return null;

  console.info(`[attachment] Processing ${attachments.length} image(s) from message ${message.id}`);

  // Analyse all images in parallel
  const analyses = await Promise.all(attachments.map(analyseAttachment));

  // Combine all OCR and captions (multiple images → separate labelled sections)
  const parts: string[] = [];

  if (userText.trim()) parts.push(`User message: ${userText.trim()}`);

  analyses.forEach((a, i) => {
    const label = analyses.length > 1 ? ` (image ${i + 1})` : '';
    if (a.ocrText) parts.push(`OCR${label}: ${a.ocrText}`);
    if (a.caption) parts.push(`Caption${label}: ${a.caption}`);
  });

  const enrichedQuery = parts.join('\n');

  return { enrichedQuery, analyses };
}
