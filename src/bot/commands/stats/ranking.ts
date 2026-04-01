import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('랭킹')
  .setDescription('서버 내 종합 랭킹을 조회합니다.');

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  // TODO: 구현
  await interaction.editReply('🚧 준비 중입니다.');
}
