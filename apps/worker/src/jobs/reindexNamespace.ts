import fs from 'fs';
import path from 'path';
import { SUPPORTED_FILE_TYPES } from '@app/core';
import { ingestDocument } from './ingestDocument.js';
import type { ReindexNamespacePayload } from '../queue/types.js';

// ── Result ────────────────────────────────────────────────────────────────────

export interface ReindexResult {
  totalFiles:      number;
  succeeded:       number;
  failed:          number;
  durationMs:      number;
  errors:          Array<{ file: string; error: string }>;
}

// ── Main job handler ──────────────────────────────────────────────────────────

/**
 * Scans a directory and re-ingests every supported document file.
 * Useful for bulk re-indexing when the chunking/embedding strategy changes.
 */
export async function reindexNamespace(
  payload: ReindexNamespacePayload,
): Promise<ReindexResult> {
  const t0 = Date.now();
  const { sourceDirectory } = payload;

  // ── 1. Find all supported files in the directory ───────────────────────────
  const allFiles = fs.readdirSync(sourceDirectory);
  const docFiles = allFiles.filter((f) => {
    const ext = path.extname(f).slice(1).toLowerCase();
    return (SUPPORTED_FILE_TYPES as readonly string[]).includes(ext);
  });

  console.info(`[reindex] Found ${docFiles.length} files in ${sourceDirectory}`);

  // ── 2. Ingest each file sequentially (avoid rate limit spikes) ─────────────
  let succeeded = 0;
  const errors: Array<{ file: string; error: string }> = [];

  for (const fileName of docFiles) {
    const filePath = path.join(sourceDirectory, fileName);
    try {
      await ingestDocument({ filePath, reindex: true });
      succeeded++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[reindex] ❌ Failed: ${fileName} — ${message}`);
      errors.push({ file: fileName, error: message });
    }
  }

  const durationMs = Date.now() - t0;

  console.info(
    `[reindex] Done: ${succeeded}/${docFiles.length} succeeded in ${durationMs}ms`,
  );

  return {
    totalFiles: docFiles.length,
    succeeded,
    failed:     errors.length,
    durationMs,
    errors,
  };
}