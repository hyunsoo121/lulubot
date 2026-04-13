import prisma from '../lib/prisma';
import redis from '../lib/redis';
import { getAllMatchIds, getMatch, sleep } from './riot';

const SCAN_LOCK_TTL = 60 * 30; // 30분 (최대 스캔 시간)
const SCAN_COOLDOWN_TTL = 60 * 3; // 3분 쿨다운

function scanLockKey(discordUserId: bigint) {
  return `scan:lock:${discordUserId}`;
}

function scanCooldownKey(discordUserId: bigint) {
  return `scan:cooldown:${discordUserId}`;
}

/** 봇 재시작 시 중단된 스캔을 감지하고 해당 유저 데이터를 초기화 */
export async function clearAllScanLocks(): Promise<void> {
  const keys = await redis.keys('scan:lock:*');
  if (keys.length === 0) return;

  for (const key of keys) {
    // scan:lock:{discordUserId} 에서 discordUserId 추출
    const discordUserId = BigInt(key.replace('scan:lock:', ''));

    // 중단된 스캔의 부분 저장 데이터를 제거 → 다음 스캔이 처음부터 시작
    const user = await prisma.user.findUnique({
      where: { discordUserId },
      include: { lolAccounts: true },
    });

    if (user) {
      const lolAccountIds = user.lolAccounts.map((a) => a.id);
      await prisma.userGlobalStat.deleteMany({ where: { lolAccountId: { in: lolAccountIds } } });
      await prisma.playerMatchStat.deleteMany({ where: { lolAccountId: { in: lolAccountIds } } });
      await prisma.matchRecord.deleteMany({ where: { playerStats: { none: {} } } });
      console.log(
        `[matchScan] 중단된 스캔 감지 (${discordUserId}) → 데이터 초기화, 다음 갱신 시 전체 재스캔`,
      );
    }
  }

  await redis.del(...keys);
}

export async function isScanningUser(discordUserId: bigint): Promise<boolean> {
  const val = await redis.get(scanLockKey(discordUserId));
  return val !== null;
}

/** 쿨다운 남은 시간(초) 반환. 0이면 쿨다운 없음 */
export async function getScanCooldown(discordUserId: bigint): Promise<number> {
  const ttl = await redis.ttl(scanCooldownKey(discordUserId));
  return ttl > 0 ? ttl : 0;
}

async function acquireScanLock(discordUserId: bigint): Promise<boolean> {
  const result = await redis.set(scanLockKey(discordUserId), '1', 'EX', SCAN_LOCK_TTL, 'NX');
  return result === 'OK';
}

async function releaseScanLock(discordUserId: bigint) {
  await redis.del(scanLockKey(discordUserId));
}

async function setScanCooldown(discordUserId: bigint) {
  await redis.set(scanCooldownKey(discordUserId), '1', 'EX', SCAN_COOLDOWN_TTL);
}

export interface ScanResult {
  scanned: number;
  saved: number;
  skipped: number;
  isFirstScan: boolean;
}

/** 매치 1건 저장 및 통계 업데이트 */
async function saveMatch(matchId: string, guildServerId: bigint | null): Promise<boolean> {
  const riot = await getMatch(matchId);
  const { info } = riot;

  // 커스텀 게임만 처리
  if (info.gameType !== 'CUSTOM_GAME') return false;

  // 리메이크/중도포기 경기 제외 (5분 미만 또는 승리팀 없음)
  if (info.gameDuration < 300) return false;
  if (!info.teams.some((t) => t.win)) return false;

  const winnerTeamId = info.teams.find((t) => t.win)?.teamId ?? 100;
  const winnerTeam = winnerTeamId === 100 ? 'BLUE' : 'RED';

  // PUUID → LolAccount 매핑
  const puuids = info.participants.map((p) => p.puuid);
  const accounts = await prisma.lolAccount.findMany({ where: { puuid: { in: puuids } } });
  const accountMap = new Map(accounts.map((a) => [a.puuid, a]));

  // MatchRecord upsert (다른 유저가 이미 저장했을 수 있음)
  const match = await prisma.matchRecord.upsert({
    where: { matchId },
    update: {},
    create: {
      matchId,
      guildServerId,
      winnerTeam: winnerTeam as 'BLUE' | 'RED',
      gameDurationSecs: info.gameDuration,
      playedAt: new Date(info.gameCreation),
    },
  });

  // 이미 PlayerMatchStat이 있는 lolAccountId 조회
  const existingStats = await prisma.playerMatchStat.findMany({
    where: { matchId: match.id },
    select: { lolAccountId: true },
  });
  const existingAccountIds = new Set(existingStats.map((s) => s.lolAccountId));

  // 팀별 총 킬 계산 (killParticipation 산출용)
  const teamKills = new Map<number, number>();
  const teamDmg = new Map<number, number>();
  const teamGold = new Map<number, number>();
  for (const p of info.participants) {
    teamKills.set(p.teamId, (teamKills.get(p.teamId) ?? 0) + p.kills);
    teamDmg.set(p.teamId, (teamDmg.get(p.teamId) ?? 0) + p.totalDamageDealtToChampions);
    teamGold.set(p.teamId, (teamGold.get(p.teamId) ?? 0) + p.goldEarned);
  }

  // 아직 저장 안 된 유저만 삽입
  const statInserts = info.participants
    .filter((p) => accountMap.has(p.puuid) && !existingAccountIds.has(accountMap.get(p.puuid)!.id))
    .map((p) => {
      const account = accountMap.get(p.puuid)!;
      const tk = teamKills.get(p.teamId) ?? 0;
      const td = teamDmg.get(p.teamId) ?? 0;
      const tg = teamGold.get(p.teamId) ?? 0;
      const kp = tk > 0 ? (p.kills + p.assists) / tk : 0;
      const dmgShare = td > 0 ? p.totalDamageDealtToChampions / td : 0;
      const goldShare = tg > 0 ? p.goldEarned / tg : 0;
      const dmgPerGold = p.goldEarned > 0 ? p.totalDamageDealtToChampions / p.goldEarned : 0;
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
        killParticipation: kp,
        turretKills: p.turretKills ?? 0,
        firstBloodKill: p.firstBloodKill ?? false,
        pentaKills: p.pentaKills ?? 0,
        quadraKills: p.quadraKills ?? 0,
        dragonKills: p.dragonKills ?? 0,
        baronKills: p.baronKills ?? 0,
        wardsPlaced: p.wardsPlaced ?? 0,
        wardsKilled: p.wardsKilled ?? 0,
        controlWardsPlaced: p.visionWardsBoughtInGame ?? 0,
        timeCCingOthers: p.timeCCingOthers ?? 0,
        enemyJungleMinions: p.totalEnemyJungleMinionsKilled ?? 0,
        objectivesStolen: p.objectivesStolen ?? 0,
        healsOnTeammates: p.totalHealsOnTeammates ?? 0,
        shieldOnTeammates: p.totalDamageShieldedOnTeammates ?? 0,
        soloKills: p.challenges?.soloKills ?? 0,
        dmgShare,
        goldShare,
        dmgPerGold,
      };
    });

  if (statInserts.length === 0) return false;

  await prisma.playerMatchStat.createMany({ data: statInserts });

  // UserGlobalStat 업데이트 (새로 삽입된 유저만)
  const newAccountIds = new Set(statInserts.map((s) => s.lolAccountId));
  for (const p of info.participants) {
    const account = accountMap.get(p.puuid);
    if (!account || !newAccountIds.has(account.id)) continue;

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
        pentaKillCount: { increment: p.pentaKills > 0 ? 1 : 0 },
      },
    });
  }

  // DuoStat 업데이트 (새로 삽입된 유저만, guildServerId 있을 때만)
  if (guildServerId) {
    const newAccounts = [...newAccountIds]
      .map((id) => accounts.find((a) => a.id === id))
      .filter(Boolean) as typeof accounts;

    for (let i = 0; i < newAccounts.length; i++) {
      for (let j = i + 1; j < newAccounts.length; j++) {
        const a1 = newAccounts[i];
        const a2 = newAccounts[j];
        const p1 = info.participants.find((p) => p.puuid === a1.puuid);
        const p2 = info.participants.find((p) => p.puuid === a2.puuid);
        if (!p1 || !p2) continue;

        const [id1, id2] = a1.id < a2.id ? [a1.id, a2.id] : [a2.id, a1.id];
        const sameTeam = p1.teamId === p2.teamId;

        await prisma.duoStat.upsert({
          where: {
            guildServerId_lolAccountId1_lolAccountId2: {
              guildServerId,
              lolAccountId1: id1,
              lolAccountId2: id2,
            },
          },
          create: {
            guildServerId,
            lolAccountId1: id1,
            lolAccountId2: id2,
            sameTeamGames: sameTeam ? 1 : 0,
            sameTeamWins: sameTeam && p1.win ? 1 : 0,
            againstGames: sameTeam ? 0 : 1,
            againstWins: !sameTeam && p1.win ? 1 : 0,
          },
          update: {
            sameTeamGames: { increment: sameTeam ? 1 : 0 },
            sameTeamWins: { increment: sameTeam && p1.win ? 1 : 0 },
            againstGames: { increment: sameTeam ? 0 : 1 },
            againstWins: { increment: !sameTeam && p1.win ? 1 : 0 },
          },
        });
      }
    }
  }

  return true;
}

/** 특정 유저(discordUserId 기준)의 전체 매치를 스캔해서 저장 */
export async function scanMatchesByUser(
  discordUserId: bigint,
  guildServerId?: bigint,
): Promise<ScanResult> {
  const locked = await acquireScanLock(discordUserId);
  if (!locked) {
    throw new Error('SCAN_IN_PROGRESS');
  }

  try {
    const user = await prisma.user.findUnique({
      where: { discordUserId },
      include: { lolAccounts: true },
    });

    // 서버 연결이 끊겼으면 복구 (데이터 초기화 후 재갱신 시)
    if (user && guildServerId) {
      await prisma.guildServer.upsert({
        where: { id: guildServerId },
        update: {},
        create: { id: guildServerId },
      });
      await prisma.userGuildServer.upsert({
        where: { userId_guildServerId: { userId: user.id, guildServerId } },
        update: {},
        create: { userId: user.id, guildServerId },
      });
    }

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

    // 마지막 저장 매치 이후만 조회. 최초 스캔이면 전체 기간 탐색
    const startTime = latestStat
      ? Math.floor(latestStat.matchRecord.playedAt.getTime() / 1000)
      : undefined;

    const isFirstScan = !latestStat;

    const matchIdSet = new Set<string>();
    for (const account of user.lolAccounts) {
      try {
        const ids = await getAllMatchIds(account.puuid, startTime);
        ids.forEach((id) => matchIdSet.add(id));
      } catch (err) {
        console.error(`[matchScan] 매치ID 조회 실패 puuid=${account.puuid}:`, err);
      }
    }

    // 오래된 순서부터 저장 → 중단 시 다음 증분 스캔이 이어받을 수 있음
    const matchIds = [...matchIdSet].reverse();
    let saved = 0;
    let skipped = 0;

    for (const matchId of matchIds) {
      try {
        const wasSaved = await saveMatch(matchId, null);
        if (wasSaved) saved++;
        else skipped++;
        await sleep(1200);
      } catch (err) {
        console.error(`[matchScan] saveMatch 실패 matchId=${matchId}:`, err);
        skipped++;
      }
    }

    await setScanCooldown(discordUserId);
    return { scanned: matchIds.length, saved, skipped, isFirstScan };
  } finally {
    await releaseScanLock(discordUserId);
  }
}
