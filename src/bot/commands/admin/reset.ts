import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';
import prisma from '../../../lib/prisma';

export const data = new SlashCommandBuilder()
  .setName('데이터초기화')
  .setDescription('이 서버의 모든 전적 데이터를 초기화합니다. (테스트용, 관리자 전용)');

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.memberPermissions?.has('Administrator')) {
    await interaction.reply({
      content: '❌ 관리자만 사용할 수 있는 명령어입니다.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const guildServerId = BigInt(interaction.guildId!);

  // 서버에 등록된 유저 조회
  const users = await prisma.user.findMany({
    where: { userGuildServers: { some: { guildServerId } } },
    include: { lolAccounts: true },
  });

  const lolAccountIds = users.flatMap((u) => u.lolAccounts.map((a) => a.id));

  // 통계 초기화
  await prisma.userGlobalStat.deleteMany({ where: { lolAccountId: { in: lolAccountIds } } });

  // 매치 데이터 초기화 (이 서버 소속 매치만)
  const matchIds = await prisma.matchRecord
    .findMany({ where: { guildServerId }, select: { id: true } })
    .then((rows) => rows.map((r) => r.id));

  if (matchIds.length > 0) {
    await prisma.playerMatchStat.deleteMany({ where: { matchId: { in: matchIds } } });
    await prisma.matchRecord.deleteMany({ where: { id: { in: matchIds } } });
  }

  // UserGuildServer 및 User 연결 해제
  await prisma.userGuildServer.deleteMany({ where: { guildServerId } });

  await interaction.editReply(
    `✅ 초기화 완료!\n> 삭제된 매치: **${matchIds.length}**건\n> 초기화된 계정: **${lolAccountIds.length}**개`,
  );
}
