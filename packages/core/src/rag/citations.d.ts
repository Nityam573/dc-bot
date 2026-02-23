import { QueryMatch } from '../pinecone/query';
export interface Citation {
    index: number;
    source: string;
    docId: string;
    score: number;
}
/**
 * Converts raw QueryMatch objects into clean Citation records.
 */
export declare function extractCitations(chunks: QueryMatch[]): Citation[];
/**
 * Appends deduplicated citation footnotes to a response string.
 */
export declare function appendCitationFooter(text: string, citations: Citation[]): string;
//# sourceMappingURL=citations.d.ts.map