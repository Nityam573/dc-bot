/**
 * scripts/clearNamespace.ts
 * Deletes ALL vectors in the configured namespace.
 * Use before re-ingesting to start fresh.
 *
 * Usage:
 *   npx tsx scripts/clearNamespace.ts
 */

import 'dotenv/config';
import { getPineconeIndex } from '../packages/core/src/pinecone/client.js';
import { env } from '../packages/core/src/config/env.js';

async function run() {
  console.log(`\n🗑️  Clearing namespace: ${env.PINECONE_NAMESPACE}`);
  console.log(`📦 Index: ${env.PINECONE_INDEX}\n`);

  const index = getPineconeIndex();
  await index.namespace(env.PINECONE_NAMESPACE).deleteAll();

  console.log('✅ Namespace cleared. All vectors deleted.');
  console.log('👉 Now re-ingest: npx tsx scripts/testIngest.ts <file>');
}

run().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});