import type { Message, Client } from 'discord.js';
import { env } from '@app/core';

/**
 * Returns true if the bot should process this message.
 */
export function shouldHandleMessage(message: Message, botClient: Client): boolean {
  // 1. Ignore bots
  if (message.author.bot) return false;

  // 2. Only in support channels
  if (!env.DISCORD_SUPPORT_CHANNEL_IDS.includes(message.channelId)) return false;

  // 3. Only when bot user is @mentioned OR the message contains any mention
  //    (handles cases where users mention a role that includes the bot)
  const botMentioned = botClient.user
    ? message.mentions.has(botClient.user.id) || message.content.includes('<@')
    : false;

  if (!botMentioned) return false;

  // 4. Ignore if nothing left after stripping all mentions
  const content = stripAllMentions(message.content).trim();
  if (!content) return false;

  return true;
}

/**
 * Strips ALL mention types from message content:
 * - User mentions: <@123456>  <@!123456>
 * - Role mentions: <@&123456>
 * - Channel mentions: <#123456>
 */
export function stripAllMentions(content: string): string {
  return content
    .replace(/<@[!&]?\d+>/g, '')  // user, user-nickname, and role mentions
    .replace(/<#\d+>/g, '')        // channel mentions
    .trim();
}

/**
 * Strips only the bot's user mention (kept for backwards compat)
 */
export function stripMention(content: string, botUserId: string): string {
  return content
    .replace(new RegExp(`<@!?${botUserId}>`, 'g'), '')
    .trim();
}