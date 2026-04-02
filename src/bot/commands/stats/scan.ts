import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { scanMatchesByUser, isScanningUser, getScanCooldown } from '../../../services/matchScan';

export const data = new SlashCommandBuilder()
  .setName('전적갱신')
  .setDescription('커스텀 게임 기록을 스캔해서 전적을 갱신합니다.')
  .addUserOption((option) =>
    option.setName('멤버').setDescription('갱신할 멤버 (미입력 시 본인)').setRequired(false),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const targetUser = interaction.options.getUser('멤버') ?? interaction.user;
  const discordUserId = BigInt(targetUser.id);
  const guildServerId = interaction.guildId ? BigInt(interaction.guildId) : undefined;
  const isSelf = targetUser.id === interaction.user.id;
  const targetLabel = isSelf ? '내' : `**${targetUser.displayName}**의`;

  // 진행 중 체크
  if (await isScanningUser(discordUserId)) {
    await interaction.reply({
      content: `⏳ ${targetLabel} 갱신이 이미 진행 중입니다. 완료 후 다시 시도해주세요.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // 쿨다운 체크
  const cooldown = await getScanCooldown(discordUserId);
  if (cooldown > 0) {
    const minutes = Math.ceil(cooldown / 60);
    const seconds = cooldown % 60;
    const timeStr = minutes > 1 ? `${minutes}분 ${seconds}초` : `${seconds}초`;
    await interaction.reply({
      content: `⏳ ${targetLabel} 갱신은 3분에 한 번만 가능합니다. **${timeStr}** 후에 다시 시도해주세요.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply();

  try {
    const notice = await interaction.editReply(`🔍 ${targetLabel} 전적 갱신 중...`);

    const result = await scanMatchesByUser(discordUserId, guildServerId);

    const header = result.isFirstScan
      ? `✅ ${targetLabel} 최초 전적 스캔 완료! (전체 기록 조회)`
      : `✅ ${targetLabel} 전적 갱신 완료! (마지막 저장 이후 신규 기록만 조회)`;

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
    console.error('[scan] 전적갱신 오류:', err);
    const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
    await interaction.editReply(`❌ ${message}`);
  }
}
