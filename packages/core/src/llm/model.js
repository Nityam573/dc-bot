import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env';
import { SYSTEM_PROMPT, buildConversationMessages } from './prompts';
import { parseAgentResponse } from './schema';
import { retrieveRelevantChunks, buildContextString } from '../rag/retriever';
import { rerankChunks } from '../rag/ranker';
import { extractCitations } from '../rag/citations';
// ── Singleton model ───────────────────────────────────────────────────────────
let _genAI = null;
let _model = null;
function getModel() {
    if (!_model) {
        _genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
        _model = _genAI.getGenerativeModel({
            model: env.GEMINI_CHAT_MODEL,
            systemInstruction: SYSTEM_PROMPT,
            generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.2, // low temp = more deterministic/factual
                topP: 0.8,
                maxOutputTokens: 1024,
            },
        });
    }
    return _model;
}
// ── Main agent function ───────────────────────────────────────────────────────
/**
 * "Support Agent" node:
 * Embeds the user query, retrieves Pinecone context, calls Gemini,
 * and returns a structured JSON response.
 */
export async function runSupportAgent(userMessage, options = {}) {
    // Step 1: Retrieve
    const queryOptions = {
        ...(options.queryOptions ?? {}),
        channelScope: options.channelId,
    };
    const retrieval = await retrieveRelevantChunks(userMessage, queryOptions);
    // Step 2: Rerank
    const reranked = rerankChunks(retrieval.chunks, userMessage);
    // Step 3: Build context string for the prompt
    const contextString = buildContextString(reranked);
    // Step 4: Build conversation messages
    const messages = buildConversationMessages(options.conversationHistory ?? [], userMessage, contextString);
    // Step 5: Call Gemini
    const model = getModel();
    const t0 = Date.now();
    const chat = model.startChat({ history: messages.slice(0, -1) });
    const result = await chat.sendMessage(messages[messages.length - 1].parts[0].text);
    const llmMs = Date.now() - t0;
    // Step 6: Parse response + extract citations
    const agentResponse = parseAgentResponse(result.response.text());
    const usedChunks = reranked.filter((_, i) => agentResponse.usedChunks.includes(i + 1));
    const citations = extractCitations(usedChunks);
    return {
        agentResponse,
        citations,
        rawChunks: reranked, // expose all chunks so handler can do accurate confidence scoring
        retrievalStats: {
            chunksFound: reranked.length,
            embeddingMs: retrieval.embeddingMs,
            queryMs: retrieval.queryMs,
            llmMs,
        },
    };
}
//# sourceMappingURL=model.js.map