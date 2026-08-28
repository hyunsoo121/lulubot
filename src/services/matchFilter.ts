import prisma from '../lib/prisma';

export interface MatchFilterOptions {
  /** true면 매치 참가자 중 서버 등록 계정이 일정 수 이상인 매치만 포함 (기준은 SERVER_ONLY_MIN_PARTICIPANTS 참고) */
  serverOnly?: boolean;
  /** 이 날짜(포함) 이후에 플레이된 매치만 포함 */
  startDate?: Date;
  /** 이 날짜(포함) 이전에 플레이된 매치만 포함 */
  endDate?: Date;
}

const SERVER_ONLY_MIN_PARTICIPANTS = 8;

/**
 * matchIds를 옵션에 따라 추가로 필터링한다.
 * - serverOnly: 매치별로 서버 등록 계정(accountIds) 참가자 수를 세어 기준치 이상인 매치만 남김
 * - startDate/endDate: MatchRecord.playedAt 기준 날짜 범위로 제한
 * 새로운 추적 로직 없이 기존 PlayerMatchStat/MatchRecord 데이터만으로 계산한다.
 */
export async function filterMatchIds(
  matchIds: bigint[],
  accountIds: bigint[],
  opts: MatchFilterOptions = {},
): Promise<bigint[]> {
  let ids = matchIds;
  if (ids.length === 0) return ids;

  if (opts.startDate || opts.endDate) {
    const where: Record<string, unknown> = { id: { in: ids } };
    const playedAt: Record<string, Date> = {};
    if (opts.startDate) playedAt.gte = opts.startDate;
    if (opts.endDate) playedAt.lte = opts.endDate;
    where.playedAt = playedAt;

    const rows = await prisma.matchRecord.findMany({ where, select: { id: true } });
    ids = rows.map((r) => r.id);
    if (ids.length === 0) return ids;
  }

  if (opts.serverOnly) {
    if (accountIds.length === 0) return [];

    // 인원 기준은 라이엇 계정이 아니라 디스코드 유저 단위여야 한다 — 한 유저가
    // 계정을 여러 개 등록해도 실제 매치엔 그중 하나로만 참여하므로, 계정 수를
    // 그대로 쓰면 멀티계정 유저가 있는 서버의 기준치가 실제 인원보다 부풀려진다.
    const accounts = await prisma.lolAccount.findMany({
      where: { id: { in: accountIds } },
      select: { id: true, userId: true },
    });
    const accountToUser = new Map(accounts.map((a) => [a.id, a.userId]));
    const uniqueUserCount = new Set(accounts.map((a) => a.userId).filter((id) => id !== null)).size;
    if (uniqueUserCount === 0) return [];

    // 원래 기준(10명 중 8명=80%)을 서버 등록 유저 수에 비례해서 적용
    const minParticipants = Math.min(
      SERVER_ONLY_MIN_PARTICIPANTS,
      Math.ceil(uniqueUserCount * 0.8),
    );

    const rows = await prisma.playerMatchStat.findMany({
      where: { matchId: { in: ids }, lolAccountId: { in: accountIds } },
      select: { matchId: true, lolAccountId: true },
    });

    const usersByMatch = new Map<string, Set<bigint>>();
    for (const r of rows) {
      const userId = accountToUser.get(r.lolAccountId);
      if (!userId) continue;
      const key = r.matchId.toString();
      const set = usersByMatch.get(key) ?? new Set<bigint>();
      set.add(userId);
      usersByMatch.set(key, set);
    }

    ids = [...usersByMatch.entries()]
      .filter(([, users]) => users.size >= minParticipants)
      .map(([key]) => BigInt(key));
  }

  return ids;
}
