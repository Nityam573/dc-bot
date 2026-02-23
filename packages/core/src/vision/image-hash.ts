/**
 * Stable SHA-256 hash for image buffers.
 * Used as a deduplication key in Pinecone metadata:
 *   - Same page re-ingested → same hash → upsert overwrites (idempotent)
 *   - Different page         → different hash → new vector
 */
import { createHash } from 'crypto';

/** Returns the hex SHA-256 of the given buffer. */
export function hashImage(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}
