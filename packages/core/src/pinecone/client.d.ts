import { Pinecone } from '@pinecone-database/pinecone';
export declare function getPineconeClient(): Pinecone;
/**
 * Returns the configured Pinecone index.
 * Use this everywhere instead of calling getPineconeClient().Index() manually.
 */
export declare function getPineconeIndex(): import("@pinecone-database/pinecone").Index<import("@pinecone-database/pinecone").RecordMetadata>;
//# sourceMappingURL=client.d.ts.map