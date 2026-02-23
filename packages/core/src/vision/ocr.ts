/**
 * OCR wrapper around tesseract.js v7.
 * Maintains a lazy singleton worker to avoid repeated WASM initialisation.
 *
 * Gracefully returns '' on failure so callers can fall back to caption-only retrieval.
 */
import { createWorker, type Worker } from 'tesseract.js';

// ── Singleton worker ──────────────────────────────────────────────────────────

let _worker: Worker | null = null;
let _initPromise: Promise<Worker> | null = null;

async function getWorker(): Promise<Worker> {
  if (_worker) return _worker;

  if (!_initPromise) {
    _initPromise = createWorker('eng', 1, {
      // suppress verbose progress logs
      logger: () => undefined,
    }).then((w) => {
      _worker = w;
      return w;
    });
  }

  return _initPromise;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Runs English OCR on a PNG/JPEG image buffer.
 * Returns extracted text, or '' if OCR fails (blurry image, no text, etc.).
 */
export async function runOCR(imageBuffer: Buffer): Promise<string> {
  try {
    const worker = await getWorker();
    const { data } = await worker.recognize(imageBuffer);
    return data.text.trim();
  } catch (err) {
    console.warn('[ocr] OCR failed — falling back to caption-only:', (err as Error).message);
    return '';
  }
}

/**
 * Call at process exit to cleanly terminate the Tesseract worker.
 * Safe to call even if OCR was never used.
 */
export async function terminateOCRWorker(): Promise<void> {
  if (_worker) {
    await _worker.terminate();
    _worker = null;
    _initPromise = null;
  }
}
