import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { registerAccount } from '../../../services/account';
import { scanMatchesByUser } from '../../../services/matchScan';

export const data = new SlashCommandBuilder()
  .setName('등록')
  .setDescription('라이엇 계정을 연결합니다.')
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

  const discordUserId = BigInt(interaction.user.id);
  const guildServerId = interaction.guildId ? BigInt(interaction.guildId) : undefined;

  try {
    const account = await registerAccount(
      discordUserId,
      gameName.trim(),
      tagLine.trim(),
      guildServerId,
    );

    await interaction.editReply(
      `✅ 등록 완료!\n**${account.gameName}#${account.tagLine}** 계정이 연결되었습니다.`,
    );

    // 백그라운드 스캔 — 에러는 콘솔에만 기록
    scanMatchesByUser(discordUserId).catch((err) => {
      console.error('[Scan] 백그라운드 스캔 오류:', err);
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';

    if (message.includes('Riot')) {
      await interaction.editReply(
        `❌ 존재하지 않는 계정입니다. 닉네임과 태그를 다시 확인해주세요.`,
      );
    } else {
      await interaction.editReply(`❌ ${message}`);
    }
  }
}
