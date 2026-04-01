import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('등록')
  .setDescription('라이엇 계정을 연결합니다.')
  .addStringOption((option) =>
    option.setName('닉네임태그').setDescription('닉네임#태그 형식으로 입력 (예: 롤닉#KR1)').setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  // TODO: 구현
  await interaction.editReply('🚧 준비 중입니다.');
}
