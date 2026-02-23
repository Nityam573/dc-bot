/**
 * scripts/testQuery.ts
 *
 * Tests the full query pipeline:
 *   embed query → retrieve chunks from Pinecone → rerank → call Gemini → print response
 *
 * Usage:
 *   npx tsx scripts/testQuery.ts "how do I reset my password?"
 */

import 'dotenv/config';
import {
  embedText,
  queryVectors,
  rerankChunks,
  buildContextString,
  runSupportAgent,
} from '../packages/core/src/index.js';

// ── Get query from CLI arg ────────────────────────────────────────────────────

const query = process.argv.slice(2).join(' ');

if (!query) {
  console.error('Usage: npx tsx scripts/testQuery.ts "your question here"');
  process.exit(1);
}

// ── Run query ─────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n🔍 Starting RAG query test...');
  console.log(`❓ Query: "${query}"\n`);

  // ── Step 1: Embed the query ─────────────────────────────────────────────
  console.log('Step 1/3: Embedding query...');
  const t0 = Date.now();
  const embedding = await embedText(query);
  console.log(`   ✅ Embedded in ${Date.now() - t0}ms (${embedding.length} dims)`);

  // ── Step 2: Retrieve from Pinecone ──────────────────────────────────────
  console.log('\nStep 2/3: Querying Pinecone...');
  const t1 = Date.now();
  const chunks = await queryVectors(embedding);
  const reranked = rerankChunks(chunks, query);
  console.log(`   ✅ Retrieved ${reranked.length} chunks in ${Date.now() - t1}ms`);

  if (reranked.length === 0) {
    console.log('\n⚠️  No chunks found above the minimum score threshold.');
    console.log('   → Check your PINECONE_NAMESPACE in .env matches what you ingested with.');
    console.log('   → Try running testIngest.ts first.');
    process.exit(0);
  }

  // Print retrieved chunks
  console.log('\n📚 Retrieved chunks:');
  reranked.forEach((c, i) => {
    console.log(`\n  [${i + 1}] score=${c.score.toFixed(3)} source=${c.source}`);
    console.log(`       "${c.text.slice(0, 120).replace(/\n/g, ' ')}..."`);
  });

  // ── Step 3: Run full support agent (retrieval + Gemini) ─────────────────
  console.log('\n\nStep 3/3: Running Support Agent (Gemini)...');
  const t2 = Date.now();
  const { agentResponse, citations, retrievalStats } = await runSupportAgent(query);
  const llmMs = Date.now() - t2;

  // ── Print result ─────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(50));
  console.log('✅ AGENT RESPONSE');
  console.log('─'.repeat(50));
  console.log(`\n${agentResponse.response}`);

  if (citations.length > 0) {
    console.log('\n📎 Citations:');
    citations.forEach((c) => console.log(`   [${c.index}] ${c.source}`));
  }

  console.log('\n' + '─'.repeat(50));
  console.log('📊 Stats:');
  console.log(`   answered:   ${agentResponse.answered}`);
  console.log(`   confidence: ${agentResponse.confidence}`);
  console.log(`   escalate:   ${agentResponse.escalate}`);
  console.log(`   chunks:     ${retrievalStats.chunksFound}`);
  console.log(`   embed ms:   ${retrievalStats.embeddingMs}`);
  console.log(`   query ms:   ${retrievalStats.queryMs}`);
  console.log(`   llm ms:     ${llmMs}`);
  console.log('─'.repeat(50));
}

run().catch((err) => {
  console.error('\n❌ Query failed:', err.message);
  process.exit(1);
});