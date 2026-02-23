/**
 * Renders each page of a PDF to a PNG Buffer using pdfjs-dist (legacy Node build)
 * and node-canvas.
 *
 * The workerSrc is resolved at runtime via import.meta.resolve so it works
 * regardless of the installation path inside the monorepo.
 */
import fs from 'fs';
import { createCanvas } from 'canvas';
import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
} from 'pdfjs-dist/legacy/build/pdf.mjs';

// ── Worker setup (done once) ───────────────────────────────────────────────────

let _workerInitialised = false;

function ensureWorker(): void {
  if (_workerInitialised) return;
  // Derive pdf.worker.mjs URL from the already-resolved pdf.mjs URL
  const pdfMjsUrl: string = import.meta.resolve('pdfjs-dist/legacy/build/pdf.mjs');
  GlobalWorkerOptions.workerSrc = pdfMjsUrl.replace('pdf.mjs', 'pdf.worker.mjs');
  _workerInitialised = true;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RenderedPage {
  pageNumber:  number;
  imageBuffer: Buffer;   // PNG bytes
  width:       number;
  height:      number;
}

// ── Renderer ──────────────────────────────────────────────────────────────────

/**
 * Renders every page of a PDF file to a PNG buffer at the given scale.
 * Scale 2.0 gives ~150 DPI for a US Letter PDF — sufficient for OCR.
 *
 * Individual page failures are logged and skipped (not thrown), so a single
 * corrupted page does not abort the whole document.
 */
export async function renderPdfPages(
  pdfPath: string,
  scale = 2.0,
): Promise<RenderedPage[]> {
  ensureWorker();

  const data = new Uint8Array(fs.readFileSync(pdfPath));
  let pdf: PDFDocumentProxy;

  try {
    pdf = await getDocument({ data }).promise;
  } catch (err) {
    throw new Error(
      `[pdf-renderer] Could not open PDF "${pdfPath}": ${(err as Error).message}`,
    );
  }

  const pages: RenderedPage[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    try {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const width  = Math.ceil(viewport.width);
      const height = Math.ceil(viewport.height);

      const canvas = createCanvas(width, height);
      const ctx    = canvas.getContext('2d');

      await page.render({
        // pdfjs-dist v5 requires both canvas and canvasContext.
        // node-canvas is compatible with the pdfjs Canvas2D API at runtime;
        // we cast to satisfy the TS type which expects HTMLCanvasElement.
        canvas:        canvas as unknown as HTMLCanvasElement,
        canvasContext: ctx    as unknown as CanvasRenderingContext2D,
        viewport,
      }).promise;

      pages.push({
        pageNumber:  pageNum,
        imageBuffer: canvas.toBuffer('image/png'),
        width,
        height,
      });

      page.cleanup();
    } catch (err) {
      console.warn(
        `[pdf-renderer] Skipping page ${pageNum} of "${pdfPath}": ${(err as Error).message}`,
      );
    }
  }

  await pdf.destroy();
  return pages;
}
