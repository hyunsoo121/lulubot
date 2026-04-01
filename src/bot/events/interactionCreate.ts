import { Client, Events, ChatInputCommandInteraction } from 'discord.js';
import { commands } from '../commands';

export default function interactionCreateEvent(client: Client) {
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction as ChatInputCommandInteraction);
    } catch (err) {
      console.error(`[Bot] 명령어 오류 (${interaction.commandName}):`, err);
      const msg = { content: '명령어 처리 중 오류가 발생했습니다.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(msg);
      } else {
        await interaction.reply(msg);
      }
    }
  });
}
