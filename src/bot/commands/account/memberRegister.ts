import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { registerAccount } from '../../../services/account';
import { scanMatchesByUser, estimateScanMinutes } from '../../../services/matchScan';
import { recalculateTitles } from '../../../services/titleService';

export const data = new SlashCommandBuilder()
  .setName('멤버등록')
  .setDescription('다른 멤버의 라이엇 계정을 등록합니다.')
  .addUserOption((option) =>
    option.setName('유저').setDescription('등록할 디스코드 유저').setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName('닉네임태그')
      .setDescription('닉네임#태그 형식으로 입력 (예: 롤닉#KR1)')
      .setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.memberPermissions?.has('Administrator')) {
    await interaction.reply({
      content: '❌ 관리자만 사용할 수 있는 명령어입니다.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const target = interaction.options.getUser('유저', true);
  const input = interaction.options.getString('닉네임태그', true);
  const [gameName, tagLine] = input.split('#');

  if (!gameName || !tagLine) {
    await interaction.editReply('올바른 형식으로 입력해주세요. 예) 롤닉#KR1');
    return;
  }

  const discordUserId = BigInt(target.id);
  const guildServerId = interaction.guildId ? BigInt(interaction.guildId) : undefined;

  try {
    const account = await registerAccount(
      discordUserId,
      gameName.trim(),
      tagLine.trim(),
      guildServerId,
    );

    await interaction.editReply(
      `✅ 등록 완료!\n${target.displayName} → **${account.gameName}#${account.tagLine}** 연결되었습니다.\n⏳ 전적 갱신을 시작합니다.`,
    );

    scanMatchesByUser(discordUserId, guildServerId, async (matchCount) => {
      if (matchCount === 0) return;
      const minutes = estimateScanMinutes(matchCount);
      await interaction
        .editReply(
          `✅ 등록 완료!\n${target.displayName} → **${account.gameName}#${account.tagLine}** 연결되었습니다.\n⏳ 총 **${matchCount}**경기 발견, 약 **${minutes}분** 정도 걸릴 예정이에요.`,
        )
        .catch(() => {});
    })
      .then(async () => {
        if (guildServerId) {
          await recalculateTitles(guildServerId).catch((e) =>
            console.error('[memberRegister] 칭호 재계산 실패:', e),
          );
        }
      })
      .catch((err) => {
        console.error('[Scan] 백그라운드 스캔 오류:', err);
      });
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
    await interaction.editReply(`❌ ${message}`);
  }
}
