import { SupportedFileType } from '../config/constants';
export interface DocumentMetadata {
    docId: string;
    fileName: string;
    fileType: SupportedFileType;
    source: string;
    version: string;
    tags: string[];
    channelScope?: string;
    ingestedAt: string;
}
/**
 * Derives metadata from a file path and merges in any caller-supplied overrides.
 * Throws if the file extension is not in SUPPORTED_FILE_TYPES.
 */
export declare function buildDocumentMetadata(filePath: string, overrides?: Partial<DocumentMetadata>): DocumentMetadata;
//# sourceMappingURL=metadata.d.ts.map