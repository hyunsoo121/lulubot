import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { scanMatchesByUser } from '../../../services/matchScan';

export const data = new SlashCommandBuilder()
  .setName('전적갱신')
  .setDescription('내 커스텀 게임 기록을 스캔해서 전적을 갱신합니다.');

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const discordUserId = BigInt(interaction.user.id);

  try {
    const notice = await interaction.editReply('🔍 전적 갱신 중...');

    const result = await scanMatchesByUser(discordUserId);

    const header = result.isFirstScan
      ? '✅ 최초 전적 스캔 완료! (전체 기록 조회)'
      : '✅ 전적 갱신 완료! (마지막 저장 이후 신규 기록만 조회)';

    await notice.edit(
      [
        header,
        ``,
        `> 총 발견: **${result.scanned}**경기`,
        `> 새로 저장: **${result.saved}**경기`,
        `> 중복/스킵: **${result.skipped}**경기`,
      ].join('\n'),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
    await interaction.editReply(`❌ ${message}`);
  }
}
