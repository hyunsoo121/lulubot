import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder, User } from 'discord.js';
import { registerAccount } from '../../../services/account';
import { scanMatchesByUser } from '../../../services/matchScan';
import { recalculateTitles } from '../../../services/titleService';

export const data = new SlashCommandBuilder()
  .setName('계정등록')
  .setDescription('라이엇 계정을 연결합니다.')
  .addUserOption((option) => option.setName('유저').setDescription('등록할 유저').setRequired(true))
  .addStringOption((option) =>
    option
      .setName('닉네임태그')
      .setDescription('닉네임#태그 형식으로 입력 (예: 롤닉#KR1)')
      .setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const input = interaction.options.getString('닉네임태그', true);
  const [gameName, tagLine] = input.split('#');

  if (!gameName || !tagLine) {
    await interaction.editReply('올바른 형식으로 입력해주세요. 예) 롤닉#KR1');
    return;
  }

  const target: User = interaction.options.getUser('유저', true);
  const isSelf = target.id === interaction.user.id;
  const discordUserId = BigInt(target.id);
  const guildServerId = interaction.guildId ? BigInt(interaction.guildId) : undefined;

  try {
    const account = await registerAccount(
      discordUserId,
      gameName.trim(),
      tagLine.trim(),
      guildServerId,
    );

    const targetLabel = isSelf ? '' : `${target.displayName} → `;
    await interaction.editReply(
      `✅ 등록 완료!\n${targetLabel}**${account.gameName}#${account.tagLine}** 계정이 연결되었습니다.\n⏳ 전적 갱신을 시작합니다. 완료되면 알려드립니다.`,
    );

    // 백그라운드 스캔 — 완료 시 채널 ephemeral 메시지 발송
    scanMatchesByUser(discordUserId, guildServerId)
      .then(async (result) => {
        if (guildServerId) {
          await recalculateTitles(guildServerId).catch((e) =>
            console.error('[register] 칭호 재계산 실패:', e),
          );
        }
        await interaction.followUp({
          content: [
            `✅ **${account.gameName}#${account.tagLine}** 전적 갱신 완료!`,
            ``,
            `> 총 발견: **${result.scanned}**경기`,
            `> 새로 저장: **${result.saved}**경기`,
          ].join('\n'),
          flags: MessageFlags.Ephemeral,
        });
      })
      .catch((err) => {
        console.error('[Scan] 백그라운드 스캔 오류:', err);
      });
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
    if (message.includes('Riot')) {
      await interaction.editReply(
        '❌ 존재하지 않는 계정입니다. 닉네임과 태그를 다시 확인해주세요.',
      );
    } else {
      await interaction.editReply(`❌ ${message}`);
    }
  }
}
