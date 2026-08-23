import prisma from '../lib/prisma';
import { getServerAccountIds, getServerMatchIds } from './titleService';
import { filterMatchIds, MatchFilterOptions } from './matchFilter';

export interface AggregatedStat {
  totalGames: number;
  totalWins: number;
  totalKills: number;
  totalDeaths: number;
  totalAssists: number;
  totalDamage: bigint;
  totalVisionScore: number;
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
    pentaKillCount: acc.pentaKillCount + s.pentaKillCount,
  }));
}

export interface MostChampion {
  championId: number;
  games: number;
  wins: number;
  kills: number;
  deaths: number;
  assists: number;
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

  // 모스트 챔피언 (상위 3개)
  const lolAccountIds = accounts.map((a) => a.id);
  const champStats = await prisma.playerMatchStat.groupBy({
    by: ['championId'],
    where: { lolAccountId: { in: lolAccountIds } },
    _count: { championId: true },
    _sum: { kills: true, deaths: true, assists: true },
    orderBy: { _count: { championId: 'desc' } },
    take: 3,
  });

  // 챔피언별 승리 수 조회 후 정렬 (판수 → 승률 → KDA)
  const mostChampions: MostChampion[] = (
    await Promise.all(
      champStats.map(async (c) => {
        const wins = await prisma.playerMatchStat.count({
          where: { lolAccountId: { in: lolAccountIds }, championId: c.championId, isWin: true },
        });
        return {
          championId: c.championId,
          games: c._count.championId,
          wins,
          kills: c._sum.kills ?? 0,
          deaths: c._sum.deaths ?? 0,
          assists: c._sum.assists ?? 0,
        };
      }),
    )
  )
    .sort((a, b) => {
      if (b.games !== a.games) return b.games - a.games;
      const wrA = a.wins / a.games;
      const wrB = b.wins / b.games;
      if (wrB !== wrA) return wrB - wrA;
      const kdaA = (a.kills + a.assists) / Math.max(a.deaths, 1);
      const kdaB = (b.kills + b.assists) / Math.max(b.deaths, 1);
      return kdaB - kdaA;
    })
    .slice(0, 3);

  return {
    accounts,
    stat: statList.length > 0 ? mergeStats(statList) : null,
    mostChampions,
  };
}

/** 서버 등록 유저의 글로벌 랭킹 (유저 단위 합산) */
export async function getServerRanking(guildServerId: bigint) {
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
    });
  return entries;
}

export async function getMostChampions(discordUserId: bigint): Promise<MostChampion[]> {
  const user = await prisma.user.findUnique({
    where: { discordUserId },
    include: { lolAccounts: true },
  });
  if (!user || user.lolAccounts.length === 0) return [];

  const lolAccountIds = user.lolAccounts.map((a) => a.id);

  const champStats = await prisma.playerMatchStat.groupBy({
    by: ['championId'],
    where: { lolAccountId: { in: lolAccountIds } },
    _count: { championId: true },
    _sum: { kills: true, deaths: true, assists: true },
  });

  const result: MostChampion[] = await Promise.all(
    champStats.map(async (c) => {
      const wins = await prisma.playerMatchStat.count({
        where: { lolAccountId: { in: lolAccountIds }, championId: c.championId, isWin: true },
      });
      return {
        championId: c.championId,
        games: c._count.championId,
        wins,
        kills: c._sum.kills ?? 0,
        deaths: c._sum.deaths ?? 0,
        assists: c._sum.assists ?? 0,
      };
    }),
  );

  return result.sort((a, b) => {
    if (b.games !== a.games) return b.games - a.games;
    const wrA = a.wins / a.games;
    const wrB = b.wins / b.games;
    if (wrB !== wrA) return wrB - wrA;
    const kdaA = (a.kills + a.assists) / Math.max(a.deaths, 1);
    const kdaB = (b.kills + b.assists) / Math.max(b.deaths, 1);
    return kdaB - kdaA;
  });
}

export interface ChampionRankRow {
  lolAccountId: bigint;
  games: number;
  wins: number;
  kills: number;
  deaths: number;
  assists: number;
}

/** 서버 등록 계정 중 특정 챔피언 3판 이상 플레이한 사람들을 승률→KDA 순으로 반환 */
export async function getChampionRanking(
  guildServerId: bigint,
  championId: number,
  filterOpts: MatchFilterOptions = {},
): Promise<ChampionRankRow[]> {
  const accountIds = await getServerAccountIds(guildServerId);
  if (accountIds.length === 0) return [];

  const allMatchIds = await getServerMatchIds(accountIds);
  const matchIds = await filterMatchIds(allMatchIds, accountIds, filterOpts);
  if (matchIds.length === 0) return [];

  const rows = await prisma.playerMatchStat.groupBy({
    by: ['lolAccountId'],
    where: { matchId: { in: matchIds }, lolAccountId: { in: accountIds }, championId },
    _count: { id: true },
    _sum: { kills: true, deaths: true, assists: true },
  });

  const wins = await Promise.all(
    rows.map((r) =>
      prisma.playerMatchStat.count({
        where: {
          matchId: { in: matchIds },
          lolAccountId: r.lolAccountId,
          championId,
          isWin: true,
        },
      }),
    ),
  );

  return rows
    .map((r, i) => ({
      lolAccountId: r.lolAccountId,
      games: r._count.id,
      wins: wins[i],
      kills: r._sum.kills ?? 0,
      deaths: r._sum.deaths ?? 0,
      assists: r._sum.assists ?? 0,
    }))
    .filter((r) => r.games >= 3)
    .sort((a, b) => {
      const wrA = a.wins / a.games;
      const wrB = b.wins / b.games;
      if (wrB !== wrA) return wrB - wrA;
      const kdaA = (a.kills + a.assists) / Math.max(a.deaths, 1);
      const kdaB = (b.kills + b.assists) / Math.max(b.deaths, 1);
      return kdaB - kdaA;
    });
}

export interface CompareStat {
  games: number;
  wins: number;
  kills: number;
  deaths: number;
  assists: number;
  totalDamage: number;
  totalGold: number;
  totalVisionScore: number;
}

const EMPTY_COMPARE_STAT: CompareStat = {
  games: 0,
  wins: 0,
  kills: 0,
  deaths: 0,
  assists: 0,
  totalDamage: 0,
  totalGold: 0,
  totalVisionScore: 0,
};

/** 서버 기준으로 한 유저의 집계 전적을 반환 (필터 옵션 적용, 등록 안 됐으면 null) */
export async function getComparisonStat(
  guildServerId: bigint,
  discordUserId: bigint,
  filterOpts: MatchFilterOptions = {},
): Promise<CompareStat | null> {
  const accountIds = await getServerAccountIds(guildServerId);

  const user = await prisma.user.findUnique({
    where: { discordUserId },
    include: { lolAccounts: true },
  });
  if (!user) return null;

  const myAccountIds = user.lolAccounts.map((a) => a.id).filter((id) => accountIds.includes(id));
  if (myAccountIds.length === 0) return null;

  const allMatchIds = await getServerMatchIds(accountIds);
  const matchIds = await filterMatchIds(allMatchIds, accountIds, filterOpts);
  if (matchIds.length === 0) return EMPTY_COMPARE_STAT;

  const stats = await prisma.playerMatchStat.findMany({
    where: { matchId: { in: matchIds }, lolAccountId: { in: myAccountIds } },
    select: {
      isWin: true,
      kills: true,
      deaths: true,
      assists: true,
      damageDealt: true,
      goldEarned: true,
      visionScore: true,
    },
  });

  return stats.reduce<CompareStat>(
    (acc, s) => ({
      games: acc.games + 1,
      wins: acc.wins + (s.isWin ? 1 : 0),
      kills: acc.kills + s.kills,
      deaths: acc.deaths + s.deaths,
      assists: acc.assists + s.assists,
      totalDamage: acc.totalDamage + s.damageDealt,
      totalGold: acc.totalGold + s.goldEarned,
      totalVisionScore: acc.totalVisionScore + s.visionScore,
    }),
    { ...EMPTY_COMPARE_STAT },
  );
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
