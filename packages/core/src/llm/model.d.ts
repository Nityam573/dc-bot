import { AgentResponse } from './schema';
import { extractCitations } from '../rag/citations';
import type { QueryOptions, QueryMatch } from '../pinecone/query';
export interface AgentRunOptions {
    channelId?: string;
    conversationHistory?: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>;
    queryOptions?: QueryOptions;
}
export interface AgentRunResult {
    agentResponse: AgentResponse;
    citations: ReturnType<typeof extractCitations>;
    rawChunks: QueryMatch[];
    retrievalStats: {
        chunksFound: number;
        embeddingMs: number;
        queryMs: number;
        llmMs: number;
    };
}
/**
 * "Support Agent" node:
 * Embeds the user query, retrieves Pinecone context, calls Gemini,
 * and returns a structured JSON response.
 */
export declare function runSupportAgent(userMessage: string, options?: AgentRunOptions): Promise<AgentRunResult>;
//# sourceMappingURL=model.d.ts.map