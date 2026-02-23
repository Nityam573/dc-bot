import type { FastifyInstance } from 'fastify';
import { saveUploadedFile } from '../storage/objectStore.js';
import { ingestDocument } from '../../../worker/src/jobs/ingestDocument.js';
import { verifyAdminToken } from '../middleware/auth.js';

export async function uploadRoute(app: FastifyInstance) {
  app.post(
    '/upload',
    { preHandler: verifyAdminToken },
    async (request, reply) => {
      const file = await request.file();

      if (!file) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }

      // 1. Save file to disk
      let saved;
      try {
        saved = await saveUploadedFile(file);
      } catch (err: any) {
        return reply.status(400).send({ error: err.message });
      }

      // 2. Run ingest directly (no queue needed for now — add BullMQ later)
      try {
        const result = await ingestDocument({ filePath: saved.filePath });
        return reply.status(200).send({
          message:         'Document ingested successfully',
          fileName:        result.fileName,
          docId:           result.docId,
          chunksCreated:   result.chunksCreated,
          vectorsUpserted: result.vectorsUpserted,
          durationMs:      result.durationMs,
        });
      } catch (err: any) {
        return reply.status(500).send({ error: `Ingest failed: ${err.message}` });
      }
    },
  );
}