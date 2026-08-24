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
  totalDamageTaken: number;
  totalGold: number;
  totalCs: number;
  totalVisionScore: number;
  totalWardsPlaced: number;
  totalControlWardsPlaced: number;
  totalKillParticipation: number;
  totalTurretKills: number;
  totalSoloKills: number;
  totalPentaKills: number;
}

const EMPTY_COMPARE_STAT: CompareStat = {
  games: 0,
  wins: 0,
  kills: 0,
  deaths: 0,
  assists: 0,
  totalDamage: 0,
  totalDamageTaken: 0,
  totalGold: 0,
  totalCs: 0,
  totalVisionScore: 0,
  totalWardsPlaced: 0,
  totalControlWardsPlaced: 0,
  totalKillParticipation: 0,
  totalTurretKills: 0,
  totalSoloKills: 0,
  totalPentaKills: 0,
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
      damageTaken: true,
      goldEarned: true,
      cs: true,
      visionScore: true,
      wardsPlaced: true,
      controlWardsPlaced: true,
      killParticipation: true,
      turretKills: true,
      soloKills: true,
      pentaKills: true,
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
      totalDamageTaken: acc.totalDamageTaken + s.damageTaken,
      totalGold: acc.totalGold + s.goldEarned,
      totalCs: acc.totalCs + s.cs,
      totalVisionScore: acc.totalVisionScore + s.visionScore,
      totalWardsPlaced: acc.totalWardsPlaced + s.wardsPlaced,
      totalControlWardsPlaced: acc.totalControlWardsPlaced + s.controlWardsPlaced,
      totalKillParticipation: acc.totalKillParticipation + s.killParticipation,
      totalTurretKills: acc.totalTurretKills + s.turretKills,
      totalSoloKills: acc.totalSoloKills + s.soloKills,
      totalPentaKills: acc.totalPentaKills + s.pentaKills,
    }),
    { ...EMPTY_COMPARE_STAT },
  );
}

export interface HeadToHeadStat {
  sameTeamGames: number;
  sameTeamWins: number;
  againstGames: number;
  user1Wins: number;
  user2Wins: number;
}

const EMPTY_HEAD_TO_HEAD: HeadToHeadStat = {
  sameTeamGames: 0,
  sameTeamWins: 0,
  againstGames: 0,
  user1Wins: 0,
  user2Wins: 0,
};

/** 두 유저의 상대전적(같은팀/맞대결) — 서버 기준, 멀티계정(스마프) 합산 */
export async function getHeadToHead(
  guildServerId: bigint,
  discordUserId1: bigint,
  discordUserId2: bigint,
  filterOpts: MatchFilterOptions = {},
): Promise<HeadToHeadStat> {
  const accountIds = await getServerAccountIds(guildServerId);
  if (accountIds.length === 0) return EMPTY_HEAD_TO_HEAD;

  const [user1, user2] = await Promise.all([
    prisma.user.findUnique({
      where: { discordUserId: discordUserId1 },
      include: { lolAccounts: true },
    }),
    prisma.user.findUnique({
      where: { discordUserId: discordUserId2 },
      include: { lolAccounts: true },
    }),
  ]);
  if (!user1 || !user2) return EMPTY_HEAD_TO_HEAD;

  const accountIds1 = new Set(user1.lolAccounts.map((a) => a.id));
  const accountIds2 = new Set(user2.lolAccounts.map((a) => a.id));
  if (accountIds1.size === 0 || accountIds2.size === 0) return EMPTY_HEAD_TO_HEAD;

  const allMatchIds = await getServerMatchIds(accountIds);
  const matchIds = await filterMatchIds(allMatchIds, accountIds, filterOpts);
  if (matchIds.length === 0) return EMPTY_HEAD_TO_HEAD;

  const rows = await prisma.playerMatchStat.findMany({
    where: {
      matchId: { in: matchIds },
      lolAccountId: { in: [...accountIds1, ...accountIds2] },
    },
    select: { matchId: true, lolAccountId: true, team: true, isWin: true },
  });

  const byMatch = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = r.matchId.toString();
    const arr = byMatch.get(key) ?? [];
    arr.push(r);
    byMatch.set(key, arr);
  }

  const result = { ...EMPTY_HEAD_TO_HEAD };
  for (const participants of byMatch.values()) {
    const p1 = participants.find((p) => accountIds1.has(p.lolAccountId));
    const p2 = participants.find((p) => accountIds2.has(p.lolAccountId));
    if (!p1 || !p2) continue;

    if (p1.team === p2.team) {
      result.sameTeamGames++;
      if (p1.isWin) result.sameTeamWins++;
    } else {
      result.againstGames++;
      if (p1.isWin) result.user1Wins++;
      else result.user2Wins++;
    }
  }

  return result;
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

export interface BanPickRow {
  championId: number;
  banCount: number;
  banRate: number;
  pickCount: number;
  pickRate: number;
  wins: number;
  winRate: number | null; // 픽된 적 없으면(밴만 당함) null
  contestRate: number; // 밴률 + 픽률
}

export interface BanPickStats {
  totalMatches: number;
  totalMatchesWithBanData: number;
  rows: BanPickRow[];
}

/**
 * 서버 기반(참가자 8명 이상) 매치 기준 챔피언별 밴픽률(밴률+픽률) · 밴률 · 픽률 · 승률.
 * 밴 데이터는 이 기능 도입 이후 새로 스캔된 매치에만 있으므로,
 * 밴률의 분모는 "밴 데이터가 있는 매치 수"로 픽률의 분모(전체 스코프 매치 수)와 다르게 계산한다.
 * 밴픽률(contestRate)은 두 비율을 그대로 합산하는 통상적인 방식(op.gg 등)을 따른다.
 */
export async function getBanPickStats(guildServerId: bigint): Promise<BanPickStats> {
  const empty: BanPickStats = { totalMatches: 0, totalMatchesWithBanData: 0, rows: [] };

  const accountIds = await getServerAccountIds(guildServerId);
  if (accountIds.length === 0) return empty;

  const allMatchIds = await getServerMatchIds(accountIds);
  const matchIds = await filterMatchIds(allMatchIds, accountIds, { serverOnly: true });
  if (matchIds.length === 0) return empty;

  const pickRows = await prisma.playerMatchStat.groupBy({
    by: ['championId'],
    where: { matchId: { in: matchIds }, lolAccountId: { in: accountIds } },
    _count: { id: true },
  });

  const winRows = await prisma.playerMatchStat.groupBy({
    by: ['championId'],
    where: { matchId: { in: matchIds }, lolAccountId: { in: accountIds }, isWin: true },
    _count: { id: true },
  });

  const banRows = await prisma.championBan.groupBy({
    by: ['championId'],
    where: { matchId: { in: matchIds } },
    _count: { id: true },
  });

  const banMatchRows = await prisma.championBan.groupBy({
    by: ['matchId'],
    where: { matchId: { in: matchIds } },
  });
  const totalMatchesWithBanData = banMatchRows.length;

  const pickMap = new Map(pickRows.map((r) => [r.championId, r._count.id]));
  const winMap = new Map(winRows.map((r) => [r.championId, r._count.id]));
  const banMap = new Map(banRows.map((r) => [r.championId, r._count.id]));
  const championIds = new Set([...pickMap.keys(), ...banMap.keys()]);

  const rows: BanPickRow[] = [...championIds].map((championId) => {
    const pickCount = pickMap.get(championId) ?? 0;
    const banCount = banMap.get(championId) ?? 0;
    const wins = winMap.get(championId) ?? 0;
    const pickRate = pickCount / matchIds.length;
    const banRate = totalMatchesWithBanData > 0 ? banCount / totalMatchesWithBanData : 0;
    return {
      championId,
      banCount,
      banRate,
      pickCount,
      pickRate,
      wins,
      winRate: pickCount > 0 ? wins / pickCount : null,
      contestRate: banRate + pickRate,
    };
  });

  rows.sort((a, b) => b.contestRate - a.contestRate);

  return { totalMatches: matchIds.length, totalMatchesWithBanData, rows };
}
