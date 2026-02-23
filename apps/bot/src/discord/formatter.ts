import type { Citation, ConfidenceLevel } from '@app/core';
import { MAX_DISCORD_MESSAGE_LENGTH } from '@app/core';

const CONFIDENCE_EMOJI: Record<ConfidenceLevel, string> = {
  high:         '✅',
  medium:       '🟡',
  low:          '⚠️',
  insufficient: '❌',
};

/**
 * Formats the agent response into a Discord-safe message.
 * - Adds confidence emoji prefix
 * - Appends deduplicated source citations
 * - Truncates to Discord's 2000 char limit
 */
export function formatReply(
  responseText:    string,
  citations:       Citation[],
  confidenceLevel: ConfidenceLevel,
): string {
  const emoji = CONFIDENCE_EMOJI[confidenceLevel] ?? '🤖';
  let message = `${emoji} ${responseText}`;

  if (citations.length > 0) {
    const unique = citations.filter(
      (c, i, arr) => arr.findIndex((x) => x.source === c.source) === i,
    );
    const sourceLines = unique.map((c, i) => `\`[${i + 1}]\` ${c.source}`).join('\n');
    message += `\n\n📚 **Sources**\n${sourceLines}`;
  }

  if (message.length > MAX_DISCORD_MESSAGE_LENGTH) {
    message = message.slice(0, MAX_DISCORD_MESSAGE_LENGTH - 20) + '\n\n_[truncated]_';
  }

  return message;
}

/**
 * Formats an escalation message when the bot can't answer confidently.
 */
export function formatEscalation(reason: string): string {
  return (
    `⚠️ I wasn't able to find a confident answer in the documentation.\n` +
    `A human support agent has been notified and will assist you shortly.\n\n` +
    `_Reason: ${reason}_`
  );
}