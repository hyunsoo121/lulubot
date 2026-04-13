import { Client, Events, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { commands } from '../commands';

export default function interactionCreateEvent(client: Client) {
  client.on(Events.InteractionCreate, async (interaction) => {
    // autocomplete 처리
    if (interaction.isAutocomplete()) {
      const command = commands.get(interaction.commandName) as {
        autocomplete?: (i: typeof interaction) => Promise<void>;
      };
      if (command?.autocomplete) {
        await command.autocomplete(interaction).catch(console.error);
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction as ChatInputCommandInteraction);
    } catch (err) {
      console.error(`[Bot] 명령어 오류 (${interaction.commandName}):`, err);
      const content = '명령어 처리 중 오류가 발생했습니다.';
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
        } else {
          await interaction.reply({ content, flags: MessageFlags.Ephemeral });
        }
      } catch {
        // interaction 만료 등으로 응답 불가한 경우 무시
      }
    }
  });
}
