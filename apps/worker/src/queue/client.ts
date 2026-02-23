import 'dotenv/config';
import { Queue, QueueEvents, type RedisOptions } from 'bullmq';
import { QUEUE_NAME, type IngestDocumentPayload } from './types.js';

// ── Redis connection options ───────────────────────────────────────────────────
// Plain options object typed as BullMQ's RedisOptions (not the union ConnectionOptions)
// so BullMQ's own ioredis types are used, avoiding version conflicts with other ioredis copies.

export const redisOptions: RedisOptions = {
  host:                 process.env.REDIS_HOST ?? 'localhost',
  port:                 Number(process.env.REDIS_PORT ?? 6379),
  ...(process.env.REDIS_PASSWORD ? { password: process.env.REDIS_PASSWORD } : {}),
  maxRetriesPerRequest: null, // required by BullMQ — do not remove
};

// ── Queue ─────────────────────────────────────────────────────────────────────

/**
 * The main ingestion queue.
 * Used by apps/api to enqueue jobs and by the worker to process them.
 */
export const ingestionQueue = new Queue<IngestDocumentPayload>(QUEUE_NAME, {
  connection: redisOptions,
  defaultJobOptions: {
    attempts:         3,
    backoff:          { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail:     200,
  },
});

// ── Queue events (for logging / monitoring) ───────────────────────────────────

export const queueEvents = new QueueEvents(QUEUE_NAME, {
  connection: redisOptions,
});