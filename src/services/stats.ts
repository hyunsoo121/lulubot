import prisma from '../lib/prisma';

export interface AggregatedStat {
  totalGames: number;
  totalWins: number;
  totalKills: number;
  totalDeaths: number;
  totalAssists: number;
  totalDamage: bigint;
  totalVisionScore: number;
  mvpCount: number;
  pentaKillCount: number;
}

function mergeStats(stats: AggregatedStat[]): AggregatedStat {
  return stats.reduce((acc, s) => ({
    totalGames: acc.totalGames + s.totalGames,
    totalWins: acc.totalWins + s.totalWins,
    totalKills: acc.totalKills + s.totalKills,
    totalDeaths: acc.totalDeaths + s.totalDeaths,
    totalAssists: acc.totalAssists + s.totalAssists,
    totalDamage: acc.totalDamage + s.totalDamage,
    totalVisionScore: acc.totalVisionScore + s.totalVisionScore,
    mvpCount: acc.mvpCount + s.mvpCount,
    pentaKillCount: acc.pentaKillCount + s.pentaKillCount,
  }));
}

export async function getGlobalStatByDiscordId(discordUserId: bigint) {
  const user = await prisma.user.findUnique({
    where: { discordUserId },
    include: {
      lolAccounts: { include: { userGlobalStat: true } },
    },
  });

  if (!user || user.lolAccounts.length === 0) return null;

  const accounts = user.lolAccounts;
  const statList = accounts
    .map((a) => a.userGlobalStat)
    .filter((s): s is NonNullable<typeof s> => s !== null);

  return {
    accounts,
    stat: statList.length > 0 ? mergeStats(statList) : null,
  };
}

/** 서버 등록 유저의 글로벌 랭킹 (유저 단위 합산) */
export async function getServerRanking(guildServerId: bigint, limit = 10) {
  const users = await prisma.user.findMany({
    where: {
      userGuildServers: { some: { guildServerId } },
      discordUserId: { not: null },
    },
    include: {
      lolAccounts: { include: { userGlobalStat: true } },
    },
  });

  const entries = users
    .map((u) => {
      const statList = u.lolAccounts
        .map((a) => a.userGlobalStat)
        .filter((s): s is NonNullable<typeof s> => s !== null);

      return {
        discordUserId: u.discordUserId!,
        accounts: u.lolAccounts,
        stat: statList.length > 0 ? mergeStats(statList) : null,
      };
    })
    .sort((a, b) => {
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
