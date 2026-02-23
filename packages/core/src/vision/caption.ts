/**
 * Gemini vision captioning for support screenshots.
 *
 * Two prompts:
 *   captionImage()  — describes UI context and errors (for ingestion)
 *   extractOCRText() — asks Gemini to extract raw visible text (for query fallback
 *                       when Tesseract fails or image is clear but complex)
 */
import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
import { env } from '../config/env.js';

// ── Singleton ─────────────────────────────────────────────────────────────────

let _genAI: GoogleGenerativeAI | null = null;
let _model: GenerativeModel | null = null;

function getVisionModel(): GenerativeModel {
  if (!_model) {
    _genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    _model = _genAI.getGenerativeModel({
      model: env.GEMINI_CHAT_MODEL,
      generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
    });
  }
  return _model;
}

// ── Prompts ───────────────────────────────────────────────────────────────────

const CAPTION_PROMPT = `You are analyzing a screenshot from technical support documentation.
Describe concisely:
1. What application or UI screen is shown
2. Any visible error messages (copy the exact text if readable)
3. The visible application state (e.g. loading, crashed, dialog open)
4. Any relevant UI elements (buttons, inputs, stack traces, log lines)
Focus on technical details useful for support troubleshooting. Be factual, no speculation.`;

const OCR_PROMPT = `Extract ALL visible text from this image exactly as it appears.
Preserve line breaks. Include error messages, log lines, button labels, and any code.
Return only the extracted text, nothing else.`;

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generates a structured description of a screenshot for RAG retrieval.
 * Returns '' on failure (network error, safety block, etc.).
 */
export async function captionImage(
  imageBuffer: Buffer,
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp' = 'image/png',
): Promise<string> {
  try {
    const model = getVisionModel();
    const result = await model.generateContent([
      { inlineData: { data: imageBuffer.toString('base64'), mimeType } },
      CAPTION_PROMPT,
    ]);
    return result.response.text().trim();
  } catch (err) {
    console.warn('[caption] Gemini vision failed:', (err as Error).message);
    return '';
  }
}

/**
 * Uses Gemini vision as a high-accuracy OCR fallback.
 * Useful when Tesseract struggles with complex fonts or dense UIs.
 * Returns '' on failure.
 */
export async function visionOCR(
  imageBuffer: Buffer,
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp' = 'image/png',
): Promise<string> {
  try {
    const model = getVisionModel();
    const result = await model.generateContent([
      { inlineData: { data: imageBuffer.toString('base64'), mimeType } },
      OCR_PROMPT,
    ]);
    return result.response.text().trim();
  } catch (err) {
    console.warn('[caption] Gemini visionOCR failed:', (err as Error).message);
    return '';
  }
}
