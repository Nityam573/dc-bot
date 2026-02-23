import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Simple admin token check.
 * Set ADMIN_TOKEN in your .env to protect the upload endpoint.
 * If ADMIN_TOKEN is not set, auth is skipped (useful for local dev).
 */
export async function verifyAdminToken(
  request: FastifyRequest,
  reply:   FastifyReply,
) {
  const adminToken = process.env.ADMIN_TOKEN;

  // Skip auth if no token configured (local dev)
  if (!adminToken) return;

  const authHeader = request.headers['authorization'];
  const token      = authHeader?.replace('Bearer ', '').trim();

  if (token !== adminToken) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
}