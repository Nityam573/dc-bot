/**
 * scripts/ingestPdfMultimodal.ts
 *
 * CLI script to run the multimodal PDF ingestion pipeline directly
 * (without going through the BullMQ worker queue).
 *
 * Usage:
 *   npx tsx scripts/ingestPdfMultimodal.ts ./docs/error-guide.pdf
 *   npx tsx scripts/ingestPdfMultimodal.ts ./docs/guide.pdf --product issuer-node --force
 */
import 'dotenv/config';
import path from 'path';
import fs from 'fs';

// Parse args
const args      = process.argv.slice(2);
const filePath  = args.find((a) => !a.startsWith('--'));
const forceFlag = args.includes('--force');
const prodIdx   = args.indexOf('--product');
const product   = prodIdx !== -1 ? args[prodIdx + 1] : undefined;

if (!filePath) {
  console.error('Usage: npx tsx scripts/ingestPdfMultimodal.ts <path-to-pdf> [--product <name>] [--force]');
  process.exit(1);
}
if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}
if (path.extname(filePath).toLowerCase() !== '.pdf') {
  console.error('Only PDF files are supported by this script.');
  process.exit(1);
}

// Import after dotenv is loaded
const { ingestPdfMultimodal } = await import('../apps/worker/src/jobs/ingestPdfMultimodal.js');
const { terminateOCRWorker }  = await import('../packages/core/src/index.js');
const { env }                 = await import('../packages/core/src/config/env.js');

console.log('\n📄 Multimodal PDF Ingestion');
console.log('────────────────────────────────────────────');
console.log(`File:        ${path.resolve(filePath)}`);
console.log(`Product:     ${product ?? '(auto-detect)'}`);
console.log(`Force:       ${forceFlag}`);
console.log(`Index:       ${env.PINECONE_INDEX}`);
console.log(`Namespace:   ${env.PINECONE_NAMESPACE}`);
console.log('────────────────────────────────────────────\n');

try {
  const result = await ingestPdfMultimodal({
    filePath: path.resolve(filePath),
    productArea: product,
    forceReindex: forceFlag,
  });

  console.log('\n✅ INGESTION COMPLETE');
  console.log('────────────────────────────────────────────');
  console.log(`Doc ID:          ${result.docId}`);
  console.log(`File:            ${result.fileName}`);
  console.log(`Pages processed: ${result.pagesProcessed}`);
  console.log(`Chunks created:  ${result.chunksCreated}`);
  console.log(`Vectors upserted:${result.vectorsUpserted}`);
  console.log(`Duration:        ${result.durationMs}ms`);
  if (result.skippedPages.length > 0) {
    console.log(`Skipped pages:   ${result.skippedPages.join(', ')} (duplicate imageHash)`);
  }
  console.log('────────────────────────────────────────────');
  console.log('\n👉 Now test: npx tsx scripts/testQuery.ts "describe the error shown"');

} catch (err) {
  console.error('\n❌ Ingestion failed:', (err as Error).message);
  process.exit(1);
} finally {
  await terminateOCRWorker();
}
