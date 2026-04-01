import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('내정보')
  .setDescription('연결된 라이엇 계정을 확인합니다.');

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  // TODO: 구현
  await interaction.editReply('🚧 준비 중입니다.');
}
