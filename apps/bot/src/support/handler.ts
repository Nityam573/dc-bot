/**
 * Main bot mention handler.
 *
 * Handles two cases:
 *   A) Text-only message → standard RAG pipeline (unchanged)
 *   B) Message with image attachment(s) → multimodal pipeline:
 *        download image → OCR + Gemini caption → enrich query → RAG
 *
 * For case B, the enriched query is:
 *   "User message: <text>\nOCR: <tesseract>\nCaption: <gemini vision>"
 * This combined string is embedded and retrieved exactly like a text query.
 */
import type { Message, Client, TextChannel, NewsChannel, ThreadChannel } from 'discord.js';
import {
  runSupportAgent,
  computeConfidence,
  checkIfSupportResponse,
} from '@app/core';
import { stripAllMentions } from '../discord/filters.js';
import { formatReply, formatEscalation } from '../discord/formatter.js';
import { buildMultimodalQuery, getImageAttachments } from '../discord/attachment.js';

export async function handleMention(
  message: Message,
  botClient: Client,
): Promise<void> {
  // 1. Strip ALL mentions to get clean question text
  const userQuestion = stripAllMentions(message.content);
  const hasImages    = getImageAttachments(message).length > 0;

  console.info(
    `[bot] @mention from ${message.author.tag} in #${message.channelId}: ` +
    `"${userQuestion.slice(0, 80)}"${hasImages ? ` [+${getImageAttachments(message).length} image(s)]` : ''}`,
  );

  // 2. Show typing indicator
  const channel = message.channel;
  if ('sendTyping' in channel && typeof (channel as any).sendTyping === 'function') {
    await (channel as TextChannel | NewsChannel | ThreadChannel).sendTyping();
  }

  try {
    // 3. Build effective query (multimodal or plain text)
    let effectiveQuery = userQuestion;
    let imageContext   = '';

    if (hasImages) {
      const multimodal = await buildMultimodalQuery(message, userQuestion);
      if (multimodal) {
        effectiveQuery = multimodal.enrichedQuery;

        // Build a short summary for logging
        const firstAnalysis = multimodal.analyses[0];
        imageContext = firstAnalysis
          ? ` | ocr=${firstAnalysis.ocrText.length}chars capt=${firstAnalysis.caption.length}chars`
          : '';

        console.info(`[bot] Multimodal query built (${effectiveQuery.length} chars)${imageContext}`);
      }
    }

    // 4. Run RAG pipeline
    const { agentResponse, citations, rawChunks } = await runSupportAgent(
      effectiveQuery,
      { channelId: message.channelId },
    );

    // 5. Compute confidence
    const confidence = computeConfidence(rawChunks, agentResponse.confidence);

    // 6. Decide: respond or escalate
    const decision = checkIfSupportResponse(agentResponse, confidence);

    // 7. Format reply
    const replyText = decision.decision === 'respond' && decision.finalResponse
      ? formatReply(decision.finalResponse, citations, confidence.level)
      : formatEscalation(decision.reason);

    // 8. Send
    await message.reply({
      content:         replyText,
      allowedMentions: { repliedUser: true },
    });

    console.info(
      `[bot] Replied — decision=${decision.decision} confidence=${confidence.score} ` +
      `level=${confidence.level} chunks=${rawChunks.length}`,
    );

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[bot] Handler error:', msg);
    await message.reply(
      '❌ Something went wrong while processing your request. Please try again later.',
    );
  }
}
