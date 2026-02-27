import type { Message, Client } from 'discord.js';
import { env } from '@app/core';

/**
 * Returns true if the bot should process this message.
 *
 * Rules (all must pass):
 *  1. Author is not a bot.
 *  2. Message is in a guild (not a DM).
 *  3. Channel is a direct child of TICKET_CATEGORY_ID (i.e. a ticket channel).
 *  4. This bot is explicitly @mentioned by the user.
 *  5. The message has text content or image attachments (not a bare mention with nothing else).
 */
export function shouldHandleMessage(message: Message, botClient: Client): boolean {
  // 1. Ignore bots
  if (message.author.bot) return false;

  // 2. Only guild messages (not DMs)
  if (!message.inGuild()) return false;

  // 3. Only ticket channels — channel must be a direct child of the configured category
  if (message.channel.parentId !== env.TICKET_CATEGORY_ID) return false;

  // 4. Only when this bot is explicitly @mentioned
  if (!botClient.user || !message.mentions.users.has(botClient.user.id)) return false;

  // 5. Must have text content or at least one attachment (ignore bare @mentions)
  const content = stripAllMentions(message.content).trim();
  if (!content && message.attachments.size === 0) return false;

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
