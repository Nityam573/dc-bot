/**
 * scripts/testIngest.ts
 *
 * Tests the full ingestion pipeline:
 *   load → normalize → chunk → embed → upsert into Pinecone
 *
 * Usage:
 *   npx tsx scripts/testIngest.ts ./docs/sample.md
 *   npx tsx scripts/testIngest.ts ./docs/sample.pdf
 */

import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import {
  loadMarkdown,
  loadText,
  loadHtml,
  loadPdf,
  normalizeText,
  chunkText,
  embedBatch,
  upsertVectors,
  buildDocumentMetadata,
  PINECONE_METADATA_KEYS,
  env,
  type ChunkVector,
} from '../packages/core/src/index.js';

// ── Get file path from CLI arg ────────────────────────────────────────────────

const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: npx tsx scripts/testIngest.ts <path-to-file>');
  console.error('Example: npx tsx scripts/testIngest.ts ./docs/sample.md');
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

// ── Run ingest ────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n🚀 Starting RAG ingest test...');
  console.log(`📄 File: ${filePath}`);
  console.log(`📦 Pinecone index: ${env.PINECONE_INDEX}`);
  console.log(`🗂️  Namespace: ${env.PINECONE_NAMESPACE}\n`);

  // 1. Load
  console.log('Step 1/5: Loading document...');
  const ext = path.extname(filePath).slice(1).toLowerCase();
  let rawText: string;

  switch (ext) {
    case 'pdf':  rawText = await loadPdf(filePath);  break;
    case 'md':   rawText = loadMarkdown(filePath);   break;
    case 'html': rawText = loadHtml(filePath);       break;
    case 'txt':  rawText = loadText(filePath);       break;
    default:
      console.error(`Unsupported file type: .${ext}`);
      process.exit(1);
  }
  console.log(`   ✅ Loaded ${rawText.length} characters`);

  // 2. Normalize
  console.log('Step 2/5: Normalizing text...');
  const cleanText = normalizeText(rawText);
  console.log(`   ✅ Normalized to ${cleanText.length} characters`);

  // 3. Chunk
  console.log('Step 3/5: Chunking...');
  const chunks = chunkText(cleanText);
  console.log(`   ✅ Created ${chunks.length} chunks`);
  console.log(`   📝 First chunk preview: "${chunks[0]?.text.slice(0, 100)}..."`);

  // 4. Embed
  console.log(`\nStep 4/5: Embedding ${chunks.length} chunks with Gemini...`);
  console.log('   (this may take a moment)\n');
  const embeddings = await embedBatch(chunks.map((c) => c.text));
  console.log(`   ✅ Generated ${embeddings.length} embeddings`);
  console.log(`   📐 Embedding dimensions: ${embeddings[0]?.length}`);

  // 5. Upsert
  console.log('\nStep 5/5: Upserting into Pinecone...');
  const metadata = buildDocumentMetadata(filePath);

  const vectors: ChunkVector[] = chunks.map((chunk, i) => ({
    id:     `${metadata.docId}#${chunk.index}`,
    values: embeddings[i],
    metadata: {
      [PINECONE_METADATA_KEYS.DOC_ID]:       metadata.docId,
      [PINECONE_METADATA_KEYS.SOURCE]:       metadata.source,
      [PINECONE_METADATA_KEYS.FILE_NAME]:    metadata.fileName,
      [PINECONE_METADATA_KEYS.FILE_TYPE]:    metadata.fileType,
      [PINECONE_METADATA_KEYS.CHUNK_INDEX]:  chunk.index,
      [PINECONE_METADATA_KEYS.TOTAL_CHUNKS]: chunks.length,
      [PINECONE_METADATA_KEYS.NAMESPACE]:    env.PINECONE_NAMESPACE,
      [PINECONE_METADATA_KEYS.VERSION]:      metadata.version,
      [PINECONE_METADATA_KEYS.TAGS]:         metadata.tags,
      [PINECONE_METADATA_KEYS.INGESTED_AT]:  metadata.ingestedAt,
      text: chunk.text,
    },
  }));

  const { upsertedCount } = await upsertVectors(vectors);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(50));
  console.log('✅ INGEST COMPLETE');
  console.log('─'.repeat(50));
  console.log(`📄 File:            ${metadata.fileName}`);
  console.log(`🆔 Doc ID:          ${metadata.docId}`);
  console.log(`📦 Chunks created:  ${chunks.length}`);
  console.log(`📤 Vectors upserted:${upsertedCount}`);
  console.log(`🗂️  Namespace:       ${env.PINECONE_NAMESPACE}`);
  console.log('─'.repeat(50));
  console.log('\n👉 Now run: npx tsx scripts/testQuery.ts "your question here"');
}

run().catch((err) => {
  console.error('\n❌ Ingest failed:', err.message);
  process.exit(1);
});