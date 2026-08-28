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
 * - serverOnly: 매치별로 서버 등록 계정(accountIds) 참가자 수를 세어 8명 이상인 매치만 남김
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
    // 서버 등록 계정이 기준치보다 적으면 절대 만족 불가능한 조건이 되므로,
    // 등록 계정 수만큼으로 기준을 낮춰 작은 서버에서도 매치가 잡히게 한다.
    const minParticipants = Math.min(SERVER_ONLY_MIN_PARTICIPANTS, accountIds.length);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const counts = (await (prisma as any).playerMatchStat.groupBy({
      by: ['matchId'],
      where: { matchId: { in: ids }, lolAccountId: { in: accountIds } },
      _count: { id: true },
    })) as { matchId: bigint; _count: { id: number } }[];
    ids = counts.filter((c) => c._count.id >= minParticipants).map((c) => c.matchId);
  }

  return ids;
}
