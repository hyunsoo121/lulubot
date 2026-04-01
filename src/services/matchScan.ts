import prisma from '../lib/prisma';
import { getAllMatchIds, getMatch, sleep } from './riot';
import { RiotMatchParticipant } from '../types';

export interface ScanResult {
  scanned: number;
  saved: number;
  skipped: number;
  isFirstScan: boolean;
}

/** MVP 판정: 승리팀 중 챔피언 딜 1위 */
function getMvpPuuid(participants: RiotMatchParticipant[]): string {
  const winners = participants.filter((p) => p.win);
  return winners.reduce((best, p) =>
    p.totalDamageDealtToChampions > best.totalDamageDealtToChampions ? p : best,
  ).puuid;
}

/** 매치 1건 저장 및 통계 업데이트 */
async function saveMatch(matchId: string, guildServerId: bigint | null): Promise<boolean> {
  // 이미 저장된 매치 스킵
  const existing = await prisma.matchRecord.findUnique({ where: { matchId } });
  if (existing) return false;

  const riot = await getMatch(matchId);
  const { info } = riot;

  // 커스텀 게임만 처리
  if (info.gameType !== 'CUSTOM_GAME') return false;

  const winnerTeamId = info.teams.find((t) => t.win)?.teamId ?? 100;
  const winnerTeam = winnerTeamId === 100 ? 'BLUE' : 'RED';
  const mvpPuuid = getMvpPuuid(info.participants);

  // PUUID → LolAccount 매핑
  const puuids = info.participants.map((p) => p.puuid);
  const accounts = await prisma.lolAccount.findMany({ where: { puuid: { in: puuids } } });
  const accountMap = new Map(accounts.map((a) => [a.puuid, a]));

  // MatchRecord 생성
  const match = await prisma.matchRecord.create({
    data: {
      matchId,
      guildServerId,
      winnerTeam: winnerTeam as 'BLUE' | 'RED',
      gameDurationSecs: info.gameDuration,
      playedAt: new Date(info.gameCreation),
    },
  });

  // PlayerMatchStat 생성 (등록된 유저만)
  const statInserts = info.participants
    .filter((p) => accountMap.has(p.puuid))
    .map((p) => {
      const account = accountMap.get(p.puuid)!;
      return {
        matchId: match.id,
        lolAccountId: account.id,
        team: (p.teamId === 100 ? 'BLUE' : 'RED') as 'BLUE' | 'RED',
        championId: p.championId,
        position: p.teamPosition || 'UNKNOWN',
        kills: p.kills,
        deaths: p.deaths,
        assists: p.assists,
        cs: p.totalMinionsKilled + p.neutralMinionsKilled,
        damageDealt: p.totalDamageDealtToChampions,
        damageTaken: p.totalDamageTaken,
        goldEarned: p.goldEarned,
        visionScore: p.visionScore,
        isWin: p.win,
        isMvp: p.puuid === mvpPuuid,
      };
    });

  if (statInserts.length > 0) {
    await prisma.playerMatchStat.createMany({ data: statInserts });
  }

  // UserGlobalStat 업데이트
  for (const p of info.participants) {
    const account = accountMap.get(p.puuid);
    if (!account) continue;

    await prisma.userGlobalStat.upsert({
      where: { lolAccountId: account.id },
      create: {
        lolAccountId: account.id,
        totalGames: 1,
        totalWins: p.win ? 1 : 0,
        totalKills: p.kills,
        totalDeaths: p.deaths,
        totalAssists: p.assists,
        totalDamage: p.totalDamageDealtToChampions,
        totalVisionScore: p.visionScore,
        mvpCount: p.puuid === mvpPuuid ? 1 : 0,
        pentaKillCount: p.pentaKills > 0 ? 1 : 0,
      },
      update: {
        totalGames: { increment: 1 },
        totalWins: { increment: p.win ? 1 : 0 },
        totalKills: { increment: p.kills },
        totalDeaths: { increment: p.deaths },
        totalAssists: { increment: p.assists },
        totalDamage: { increment: p.totalDamageDealtToChampions },
        totalVisionScore: { increment: p.visionScore },
        mvpCount: { increment: p.puuid === mvpPuuid ? 1 : 0 },
        pentaKillCount: { increment: p.pentaKills > 0 ? 1 : 0 },
      },
    });
  }

  return true;
}

/** 특정 유저(discordUserId 기준)의 전체 매치를 스캔해서 저장 */
export async function scanMatchesByUser(discordUserId: bigint): Promise<ScanResult> {
  const user = await prisma.user.findUnique({
    where: { discordUserId },
    include: { lolAccounts: true },
  });

  if (!user || user.lolAccounts.length === 0) {
    throw new Error('등록된 라이엇 계정이 없습니다. `/등록` 먼저 해주세요.');
  }

  // 해당 유저의 가장 최근 저장된 매치 날짜 조회
  const lolAccountIds = user.lolAccounts.map((a) => a.id);
  const latestStat = await prisma.playerMatchStat.findFirst({
    where: { lolAccountId: { in: lolAccountIds } },
    include: { matchRecord: true },
    orderBy: { matchRecord: { playedAt: 'desc' } },
  });

  // 마지막 저장 매치 이후만 조회 (최초 스캔이면 startTime 없음 → 전체)
  const startTime = latestStat
    ? Math.floor(latestStat.matchRecord.playedAt.getTime() / 1000)
    : undefined;

  const isFirstScan = startTime === undefined;

  const matchIdSet = new Set<string>();
  for (const account of user.lolAccounts) {
    const ids = await getAllMatchIds(account.puuid, startTime);
    ids.forEach((id) => matchIdSet.add(id));
  }

  const matchIds = [...matchIdSet];
  let saved = 0;
  let skipped = 0;

  for (const matchId of matchIds) {
    try {
      const wasSaved = await saveMatch(matchId, null);
      if (wasSaved) saved++;
      else skipped++;
      await sleep(100);
    } catch {
      skipped++;
    }
  }

  return { scanned: matchIds.length, saved, skipped, isFirstScan };
}
