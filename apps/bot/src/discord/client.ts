import { Client, GatewayIntentBits, Partials } from 'discord.js';

/**
 * Discord client configured with the minimum intents needed:
 * - Guilds           → access server/channel info
 * - GuildMessages    → receive messages in servers
 * - MessageContent   → read the actual message text (Privileged Intent)
 * - DirectMessages   → receive DMs (needed for Partials.Channel)
 */
export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});