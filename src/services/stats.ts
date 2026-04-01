import prisma from '../lib/prisma';

export async function getGlobalStatByDiscordId(discordUserId: bigint) {
  const user = await prisma.user.findUnique({
    where: { discordUserId },
    include: {
      lolAccounts: {
        include: { userGlobalStat: true },
      },
    },
  });

  if (!user || user.lolAccounts.length === 0) return null;

  // 계정이 여러 개면 합산
  const account = user.lolAccounts[0];
  return { account, stat: account.userGlobalStat };
}

/** 서버 등록 유저의 글로벌 랭킹 */
export async function getServerRanking(guildServerId: bigint, limit = 10) {
  const users = await prisma.user.findMany({
    where: {
      userGuildServers: { some: { guildServerId } },
      discordUserId: { not: null },
    },
    include: {
      lolAccounts: {
        include: { userGlobalStat: true },
      },
    },
  });

  const entries = users
    .flatMap((u) => u.lolAccounts.map((a) => ({ account: a, stat: a.userGlobalStat })))
    .sort((a, b) => {
      // 스탯 없는 유저는 맨 뒤
      if (!a.stat && !b.stat) return 0;
      if (!a.stat) return 1;
      if (!b.stat) return -1;
      const wrA = a.stat.totalWins / Math.max(a.stat.totalGames, 1);
      const wrB = b.stat.totalWins / Math.max(b.stat.totalGames, 1);
      if (wrB !== wrA) return wrB - wrA;
      const kdaA = (a.stat.totalKills + a.stat.totalAssists) / Math.max(a.stat.totalDeaths, 1);
      const kdaB = (b.stat.totalKills + b.stat.totalAssists) / Math.max(b.stat.totalDeaths, 1);
      return kdaB - kdaA;
    })
    .slice(0, limit);

  return entries;
}

export async function getRecentMatchByDiscordId(discordUserId: bigint) {
  const user = await prisma.user.findUnique({
    where: { discordUserId },
    include: { lolAccounts: true },
  });

  if (!user || user.lolAccounts.length === 0) return null;

  const lolAccountIds = user.lolAccounts.map((a) => a.id);

  const stat = await prisma.playerMatchStat.findFirst({
    where: { lolAccountId: { in: lolAccountIds } },
    orderBy: { matchRecord: { playedAt: 'desc' } },
    include: {
      matchRecord: {
        include: {
          playerStats: {
            include: { lolAccount: true },
          },
        },
      },
      lolAccount: true,
    },
  });

  return stat;
}
