import path from 'path';
import { randomUUID } from 'crypto';
import { SUPPORTED_FILE_TYPES } from '../config/constants';
// ── Builder ───────────────────────────────────────────────────────────────────
/**
 * Derives metadata from a file path and merges in any caller-supplied overrides.
 * Throws if the file extension is not in SUPPORTED_FILE_TYPES.
 */
export function buildDocumentMetadata(filePath, overrides = {}) {
    const fileName = path.basename(filePath);
    const ext = path.extname(filePath).slice(1).toLowerCase();
    if (!SUPPORTED_FILE_TYPES.includes(ext)) {
        throw new Error(`Unsupported file type: .${ext}. Supported: ${SUPPORTED_FILE_TYPES.join(', ')}`);
    }
    return {
        docId: randomUUID(),
        fileName,
        fileType: ext,
        source: filePath,
        version: '1',
        tags: [],
        ingestedAt: new Date().toISOString(),
        ...overrides,
    };
}
//# sourceMappingURL=metadata.js.map