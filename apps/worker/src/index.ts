import 'dotenv/config';
import { Worker, type Job } from 'bullmq';
import { terminateOCRWorker } from '@app/core';
import { redisOptions, ingestionQueue } from './queue/client.js';
import { ingestDocument } from './jobs/ingestDocument.js';
import { ingestPdfMultimodal } from './jobs/ingestPdfMultimodal.js';
import { reindexNamespace } from './jobs/reindexNamespace.js';
import {
  QUEUE_NAME,
  type IngestDocumentPayload,
  type IngestPdfMultimodalPayload,
  type ReindexNamespacePayload,
} from './queue/types.js';

// ── Worker ────────────────────────────────────────────────────────────────────

const worker = new Worker(
  QUEUE_NAME,
  async (job: Job) => {
    console.info(`[worker] Starting job id=${job.id} name=${job.name}`);

    switch (job.name) {
      case 'ingest-document':
        return await ingestDocument(job.data as IngestDocumentPayload);

      case 'ingest-pdf-multimodal':
        return await ingestPdfMultimodal(job.data as IngestPdfMultimodalPayload);

      case 'reindex-namespace':
        return await reindexNamespace(job.data as ReindexNamespacePayload);

      default:
        throw new Error(`Unknown job name: ${job.name}`);
    }
  },
  {
    connection: redisOptions,
    concurrency: 2,   // process 2 docs at a time — safe for Gemini rate limits
  },
);

// ── Lifecycle events ──────────────────────────────────────────────────────────

worker.on('completed', (job, result) => {
  console.info(`[worker] ✅ Job id=${job.id} (${job.name}) completed:`, result);
});

worker.on('failed', (job, err) => {
  console.error(`[worker] ❌ Job id=${job?.id} (${job?.name}) failed: ${err.message}`);
});

worker.on('error', (err) => {
  console.error('[worker] Worker error:', err.message);
});

// ── Startup ───────────────────────────────────────────────────────────────────

console.info(`[worker] 🚀 Listening on queue: "${QUEUE_NAME}" (concurrency: 2)`);

// ── Graceful shutdown ─────────────────────────────────────────────────────────

async function shutdown(signal: string) {
  console.info(`[worker] ${signal} received — shutting down gracefully...`);
  await worker.close();
  await ingestionQueue.close();
  await terminateOCRWorker(); // clean up Tesseract WASM worker
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));