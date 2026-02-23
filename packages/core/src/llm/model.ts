import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { env } from '../config/env.js';
import { SYSTEM_PROMPT, buildConversationMessages } from './prompts.js';
import { AgentResponse, parseAgentResponse } from './schema.js';
import { retrieveRelevantChunks, buildContextString } from '../rag/retriever.js';
import { rerankChunks } from '../rag/ranker.js';
import { extractCitations } from '../rag/citations.js';
import type { QueryOptions, QueryMatch } from '../pinecone/query.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AgentRunOptions {
  channelId?: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  queryOptions?: QueryOptions;
}

export interface AgentRunResult {
  agentResponse: AgentResponse;
  citations:     ReturnType<typeof extractCitations>;
  rawChunks:     QueryMatch[]; // all retrieved chunks — for accurate confidence scoring
  retrievalStats: {
    chunksFound: number;
    embeddingMs: number;
    queryMs:     number;
    llmMs:       number;
  };
}

// ── Singleton model ───────────────────────────────────────────────────────────

let _genAI:  GoogleGenerativeAI | null = null;
let _model:  GenerativeModel    | null = null;

function getModel(): GenerativeModel {
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
export async function runSupportAgent(
  userMessage: string,
  options: AgentRunOptions = {},
): Promise<AgentRunResult> {

  // Step 1: Retrieve
  // Note: channelScope is only applied if explicitly set in queryOptions.
  // Do NOT auto-map channelId → channelScope here; documents ingested without
  // a channelScope field would match nothing against a strict $eq filter.
  const queryOptions: QueryOptions = {
    ...(options.queryOptions ?? {}),
  };
  const retrieval = await retrieveRelevantChunks(userMessage, queryOptions);

  // Step 2: Rerank
  const reranked = rerankChunks(retrieval.chunks, userMessage);

  // Step 3: Build context string for the prompt
  const contextString = buildContextString(reranked);

  // Step 4: Build conversation messages
  const messages = buildConversationMessages(
    options.conversationHistory ?? [],
    userMessage,
    contextString,
  );

  // Step 5: Call Gemini
  const model = getModel();
  const t0 = Date.now();
  const chat = model.startChat({ history: messages.slice(0, -1) as any });
  const result = await chat.sendMessage(messages[messages.length - 1].parts[0].text);
  const llmMs = Date.now() - t0;

  // Step 6: Parse response + extract citations
  const agentResponse = parseAgentResponse(result.response.text());
  const usedChunks    = reranked.filter((_, i) => agentResponse.usedChunks.includes(i + 1));
  const citations     = extractCitations(usedChunks);

  return {
    agentResponse,
    citations,
    rawChunks: reranked, // expose all chunks so handler can do accurate confidence scoring
    retrievalStats: {
      chunksFound: reranked.length,
      embeddingMs: retrieval.embeddingMs,
      queryMs:     retrieval.queryMs,
      llmMs,
    },
  };
}