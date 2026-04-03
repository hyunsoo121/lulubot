import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';
import prisma from '../../../lib/prisma';
import { getAccountByDiscordId } from '../../../services/account';

export const data = new SlashCommandBuilder()
  .setName('계정삭제')
  .setDescription('이 서버에서 라이엇 계정 연결을 해제합니다.')
  .addUserOption((option) =>
    option.setName('유저').setDescription('삭제할 유저').setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName('닉네임태그')
      .setDescription('삭제할 계정 (예: 롤닉#KR1)')
      .setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
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

  const accounts = await getAccountByDiscordId(discordUserId);

  if (accounts.length === 0) {
    await interaction.editReply(`${target.displayName} 님은 등록된 계정이 없습니다.`);
    return;
  }

  const account = accounts.find(
    (a) =>
      a.gameName.toLowerCase() === gameName.trim().toLowerCase() &&
      a.tagLine.toLowerCase() === tagLine.trim().toLowerCase(),
  );

  if (!account) {
    await interaction.editReply(
      `**${gameName.trim()}#${tagLine.trim()}** 계정을 찾을 수 없습니다.\n현재 등록된 계정: ${accounts.map((a) => `${a.gameName}#${a.tagLine}`).join(', ')}`,
    );
    return;
  }

  // 이 서버에서 계정의 유저 연결 해제 (LolAccount.userId → null)
  await prisma.lolAccount.update({
    where: { id: account.id },
    data: { userId: null },
  });

  // 해당 유저에 남은 다른 계정이 없으면 서버 연결도 해제
  const remainingAccounts = await getAccountByDiscordId(discordUserId);
  if (remainingAccounts.length === 0 && guildServerId) {
    const user = await prisma.user.findUnique({ where: { discordUserId } });
    if (user) {
      await prisma.userGuildServer.deleteMany({
        where: { userId: user.id, guildServerId },
      });
    }
  }

  await interaction.editReply(
    `✅ **${account.gameName}#${account.tagLine}** 연결이 해제되었습니다.\n전적 데이터는 유지됩니다. 재등록 시 기존 데이터를 그대로 이어받습니다.`,
  );
}
