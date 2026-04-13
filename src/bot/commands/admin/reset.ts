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

  // 이 서버에 등록된 유저 및 계정 조회
  const users = await prisma.user.findMany({
    where: { userGuildServers: { some: { guildServerId } } },
    include: { lolAccounts: true },
  });

  const lolAccountIds = users.flatMap((u) => u.lolAccounts.map((a) => a.id));

  // 글로벌 통계 초기화
  await prisma.userGlobalStat.deleteMany({ where: { lolAccountId: { in: lolAccountIds } } });

  // 해당 계정의 PlayerMatchStat 전체 삭제 (guildServerId 무관)
  await prisma.playerMatchStat.deleteMany({ where: { lolAccountId: { in: lolAccountIds } } });

  // PlayerMatchStat이 없는 MatchRecord 정리 (orphan)
  await prisma.matchRecord.deleteMany({ where: { playerStats: { none: {} } } });

  // UserGuildServer 연결 해제
  await prisma.userGuildServer.deleteMany({ where: { guildServerId } });

  await interaction.editReply(
    `✅ 초기화 완료!\n> 초기화된 계정: **${lolAccountIds.length}**개\n> 계정은 유지됩니다. 재등록 없이 바로 \`/전적갱신\` 하면 처음부터 다시 스캔합니다.`,
  );
}
