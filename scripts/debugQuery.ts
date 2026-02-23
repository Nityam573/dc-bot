/**
 * scripts/debugQuery.ts
 * Shows RAW Pinecone scores with NO minimum score filter.
 * Use this to diagnose why queries return 0 chunks.
 *
 * Usage:
 *   npx tsx scripts/debugQuery.ts "explain the issuer node components"
 */

import 'dotenv/config';
import { embedText } from '../packages/core/src/rag/embedder.js';
import { getPineconeIndex } from '../packages/core/src/pinecone/client.js';
import { env } from '../packages/core/src/config/env.js';

const query = process.argv.slice(2).join(' ');
if (!query) {
  console.error('Usage: npx tsx scripts/debugQuery.ts "your question"');
  process.exit(1);
}

async function run() {
  console.log(`\n🔍 Debug query: "${query}"`);
  console.log(`📦 Index: ${env.PINECONE_INDEX}`);
  console.log(`🗂️  Namespace: ${env.PINECONE_NAMESPACE}\n`);

  // 1. Embed
  console.log('Embedding query...');
  const vector = await embedText(query);
  console.log(`✅ Embedded (${vector.length} dims)\n`);

  // 2. Query with NO score filter and topK=10
  console.log('Querying Pinecone (no score filter)...');
  const index = getPineconeIndex();
  const response = await index.namespace(env.PINECONE_NAMESPACE).query({
    vector,
    topK: 10,
    includeMetadata: true,
    includeValues: false,
  });

  const matches = response.matches ?? [];
  console.log(`Found ${matches.length} raw matches:\n`);

  if (matches.length === 0) {
    console.log('❌ NO MATCHES AT ALL — vectors are not in this namespace.');
    console.log('\nPossible causes:');
    console.log('  1. Wrong PINECONE_NAMESPACE in .env');
    console.log('  2. Doc was not re-ingested after changing normalize.ts');
    console.log('  3. Wrong PINECONE_INDEX in .env');
    return;
  }

  matches.forEach((m, i) => {
    console.log(`[${i + 1}] score=${m.score?.toFixed(4)}  id=${m.id}`);
    console.log(`     text="${String(m.metadata?.text ?? '').slice(0, 100).replace(/\n/g, ' ')}"`);
    console.log();
  });

  const topScore = matches[0]?.score ?? 0;
  console.log(`\n📊 Top score: ${topScore?.toFixed(4)}`);
  console.log(`📊 Current MIN_CONFIDENCE_SCORE: ${env.MIN_CONFIDENCE_SCORE}`);

  if (topScore < env.MIN_CONFIDENCE_SCORE) {
    console.log(`\n⚠️  All scores are below threshold (${env.MIN_CONFIDENCE_SCORE}).`);
    console.log(`   → Lower MIN_CONFIDENCE_SCORE to ${(topScore - 0.05).toFixed(2)} or below to get results.`);
  } else {
    console.log('\n✅ Scores are above threshold — something else is wrong.');
  }
}

run().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});