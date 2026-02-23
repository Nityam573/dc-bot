import 'dotenv/config';
import { Events } from 'discord.js';
import { client } from './discord/client.js';
import { shouldHandleMessage } from './discord/filters.js';
import { handleMention } from './support/handler.js';
import { env } from '@app/core';

// ── Ready ─────────────────────────────────────────────────────────────────────

client.once(Events.ClientReady, (readyClient) => {
  console.log('\n🤖 Bot is online!');
  console.log(`   Logged in as: ${readyClient.user.tag}`);
  console.log(`   Watching channels: ${env.DISCORD_SUPPORT_CHANNEL_IDS.join(', ')}`);
  console.log('   Responding to: @mentions only\n');
});

// ── Message handler ───────────────────────────────────────────────────────────

client.on(Events.MessageCreate, async (message) => {
  // Filter — only process valid @mentions in support channels
  if (!shouldHandleMessage(message, client)) return;

  await handleMention(message, client);
});

// ── Error handling ────────────────────────────────────────────────────────────

client.on(Events.Error, (err) => {
  console.error('[bot] Discord client error:', err.message);
});

// ── Login ─────────────────────────────────────────────────────────────────────

await client.login(env.DISCORD_BOT_TOKEN);