import { Client, GatewayIntentBits } from 'discord.js';
import readyEvent from './events/ready';
import interactionCreateEvent from './events/interactionCreate';

export function createBotClient(): Client {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  readyEvent(client);
  interactionCreateEvent(client);

  return client;
}
