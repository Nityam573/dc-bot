import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import type { MultipartFile } from '@fastify/multipart';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './uploads';

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export interface SavedFile {
  filePath:     string;
  fileName:     string;
  mimeType:     string;
  sizeBytes:    number;
}

const ALLOWED_EXTENSIONS = ['.pdf', '.md', '.html', '.txt'];

/**
 * Saves an uploaded multipart file to the local UPLOAD_DIR.
 * Returns the saved file path and metadata.
 */
export async function saveUploadedFile(file: MultipartFile): Promise<SavedFile> {
  const ext = path.extname(file.filename).toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(
      `Unsupported file type: ${ext}. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
    );
  }

  // Sanitize filename — no path traversal
  const safeName = path.basename(file.filename).replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = path.join(UPLOAD_DIR, `${Date.now()}_${safeName}`);

  // Stream file to disk
  await pipeline(file.file, fs.createWriteStream(filePath));

  const stats = fs.statSync(filePath);

  return {
    filePath,
    fileName:  safeName,
    mimeType:  file.mimetype,
    sizeBytes: stats.size,
  };
}