import { Client, GatewayIntentBits } from 'discord.js';
import readyEvent from './events/ready';
import interactionCreateEvent from './events/interactionCreate';
import guildCreateEvent from './events/guildCreate';

export function createBotClient(): Client {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  readyEvent(client);
  interactionCreateEvent(client);
  guildCreateEvent(client);

  return client;
}
