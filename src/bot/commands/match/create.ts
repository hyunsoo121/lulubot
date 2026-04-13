import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('내전생성')
  .setDescription('토너먼트 코드를 발급합니다.');

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  // TODO: 구현
  await interaction.editReply('🚧 준비 중입니다.');
}
