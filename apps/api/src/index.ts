import 'dotenv/config';
import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import { uploadRoute } from './routes/upload.js';
import { healthRoute } from './routes/health.js';

const app = Fastify({ logger: true });

// ── Plugins ───────────────────────────────────────────────────────────────────

await app.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
});

// ── Routes ────────────────────────────────────────────────────────────────────

await app.register(healthRoute);
await app.register(uploadRoute, { prefix: '/api' });

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? '0.0.0.0';

try {
  await app.listen({ port: PORT, host: HOST });
  console.log(`\n🚀 API server running at http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`📤 Upload endpoint: http://localhost:${PORT}/api/upload\n`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}