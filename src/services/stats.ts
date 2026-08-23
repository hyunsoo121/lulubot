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

export interface RankingEntry {
  discordUserId: bigint;
  accounts: { id: bigint; gameName: string; tagLine: string }[];
  games: number;
  wins: number;
  kills: number;
  deaths: number;
  assists: number;
}

/** 서버 등록 유저의 랭킹 (유저 단위 합산, 판수→승률→KDA 순). filterOpts로 서버기반/시즌 필터 적용 가능 */
export async function getRanking(
  guildServerId: bigint,
  filterOpts: MatchFilterOptions = {},
): Promise<RankingEntry[]> {
  const users = await prisma.user.findMany({
    where: {
      userGuildServers: { some: { guildServerId } },
      discordUserId: { not: null },
    },
    include: { lolAccounts: true },
  });
  if (users.length === 0) return [];

  const accountIds = await getServerAccountIds(guildServerId);
  const allMatchIds = await getServerMatchIds(accountIds);
  const matchIds = await filterMatchIds(allMatchIds, accountIds, filterOpts);

  const accountToUser = new Map<bigint, bigint>();
  for (const u of users) {
    for (const a of u.lolAccounts) accountToUser.set(a.id, u.discordUserId!);
  }

  const stats =
    matchIds.length === 0
      ? []
      : await prisma.playerMatchStat.findMany({
          where: { matchId: { in: matchIds }, lolAccountId: { in: accountIds } },
          select: { lolAccountId: true, isWin: true, kills: true, deaths: true, assists: true },
        });

  type Agg = { games: number; wins: number; kills: number; deaths: number; assists: number };
  const agg = new Map<bigint, Agg>();
  for (const s of stats) {
    const discordUserId = accountToUser.get(s.lolAccountId);
    if (!discordUserId) continue;
    const cur = agg.get(discordUserId) ?? { games: 0, wins: 0, kills: 0, deaths: 0, assists: 0 };
    cur.games++;
    if (s.isWin) cur.wins++;
    cur.kills += s.kills;
    cur.deaths += s.deaths;
    cur.assists += s.assists;
    agg.set(discordUserId, cur);
  }

  const entries: RankingEntry[] = users.map((u) => {
    const stat = agg.get(u.discordUserId!) ?? {
      games: 0,
      wins: 0,
      kills: 0,
      deaths: 0,
      assists: 0,
    };
    return { discordUserId: u.discordUserId!, accounts: u.lolAccounts, ...stat };
  });

  return entries.sort((a, b) => {
    if (b.games !== a.games) return b.games - a.games;
    const wrA = a.games > 0 ? a.wins / a.games : -1;
    const wrB = b.games > 0 ? b.wins / b.games : -1;
    if (wrB !== wrA) return wrB - wrA;
    const kdaA = (a.kills + a.assists) / Math.max(a.deaths, 1);
    const kdaB = (b.kills + b.assists) / Math.max(b.deaths, 1);
    return kdaB - kdaA;
  });
}

export interface DuoRankRow {
  lolAccountId1: bigint;
  lolAccountId2: bigint;
  sameTeamGames: number;
  sameTeamWins: number;
  againstGames: number;
  againstWins: number;
}

/** 서버 등록 계정끼리의 듀오(같은팀/상대팀) 전적을 실시간 집계 (id가 더 작은 쪽이 lolAccountId1 기준) */
export async function getDuoRanking(
  guildServerId: bigint,
  filterOpts: MatchFilterOptions = {},
): Promise<DuoRankRow[]> {
  const accountIds = await getServerAccountIds(guildServerId);
  if (accountIds.length === 0) return [];

  const allMatchIds = await getServerMatchIds(accountIds);
  const matchIds = await filterMatchIds(allMatchIds, accountIds, filterOpts);
  if (matchIds.length === 0) return [];

  const rows = await prisma.playerMatchStat.findMany({
    where: { matchId: { in: matchIds }, lolAccountId: { in: accountIds } },
    select: { matchId: true, lolAccountId: true, team: true, isWin: true },
  });

  const byMatch = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = r.matchId.toString();
    const arr = byMatch.get(key) ?? [];
    arr.push(r);
    byMatch.set(key, arr);
  }

  type DuoAgg = {
    sameTeamGames: number;
    sameTeamWins: number;
    againstGames: number;
    againstWins: number;
  };
  const pairMap = new Map<string, DuoAgg>();

  for (const participants of byMatch.values()) {
    const sorted = [...participants].sort((a, b) => (a.lolAccountId < b.lolAccountId ? -1 : 1));
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const p1 = sorted[i]; // id가 더 작은 쪽
        const p2 = sorted[j];
        const key = `${p1.lolAccountId}:${p2.lolAccountId}`;
        const cur = pairMap.get(key) ?? {
          sameTeamGames: 0,
          sameTeamWins: 0,
          againstGames: 0,
          againstWins: 0,
        };
        const sameTeam = p1.team === p2.team;
        if (sameTeam) {
          cur.sameTeamGames++;
          if (p1.isWin) cur.sameTeamWins++;
        } else {
          cur.againstGames++;
          if (p1.isWin) cur.againstWins++;
        }
        pairMap.set(key, cur);
      }
    }
  }

  return [...pairMap.entries()].map(([key, agg2]) => {
    const [id1, id2] = key.split(':').map(BigInt);
    return { lolAccountId1: id1, lolAccountId2: id2, ...agg2 };
  });
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

/** 서버 등록 계정 중 특정 챔피언을 플레이한 적 있는 사람들을 판수→승률→KDA 순으로 반환 */
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
    .filter((r) => r.games >= 1)
    .sort((a, b) => {
      if (b.games !== a.games) return b.games - a.games;
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
