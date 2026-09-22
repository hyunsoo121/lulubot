import prisma from '../lib/prisma';

export interface MatchFilterOptions {
  /** true면 매치 참가자 중 서버 등록 계정이 SERVER_ONLY_MIN_PARTICIPANTS명 이상인 매치만 포함 */
  serverOnly?: boolean;
  /** 이 날짜(포함) 이후에 플레이된 매치만 포함 */
  startDate?: Date;
  /** 이 날짜(포함) 이전에 플레이된 매치만 포함 */
  endDate?: Date;
}

/**
 * 서버기반(serverOnly) 필터의 매치당 최소 참가자 수 — 고정값.
 * 서버 등록 인원 수에 비례해서 낮추지 않는다: 그러면 서버마다 기준이 달라지고
 * 인원이 들고날 때마다 과거 판의 인정 여부까지 바뀌어서 유저가 예측할 수 없다.
 * 대신 인원이 이 수치 미만인 서버는 각 커맨드에서 "N명 이상부터 사용 가능"이라고
 * 명확히 안내한다 (getRegisteredUserCount 참고).
 */
export const SERVER_ONLY_MIN_PARTICIPANTS = 8;

/** accountIds → userId 매핑 (userId 없는 계정은 제외) */
async function getAccountToUserMap(accountIds: bigint[]): Promise<Map<bigint, bigint>> {
  if (accountIds.length === 0) return new Map();
  const accounts = await prisma.lolAccount.findMany({
    where: { id: { in: accountIds } },
    select: { id: true, userId: true },
  });
  return new Map(
    accounts
      .filter((a): a is typeof a & { userId: bigint } => a.userId !== null)
      .map((a) => [a.id, a.userId]),
  );
}

/** 서버 등록 계정들이 실제로 몇 명의 고유 디스코드 유저에 대응하는지(멀티계정 중복 제거) */
export async function getRegisteredUserCount(accountIds: bigint[]): Promise<number> {
  const accountToUser = await getAccountToUserMap(accountIds);
  return new Set(accountToUser.values()).size;
}

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
    const accountToUser = await getAccountToUserMap(accountIds);
    if (accountToUser.size === 0) return [];

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
      .filter(([, users]) => users.size >= SERVER_ONLY_MIN_PARTICIPANTS)
      .map(([key]) => BigInt(key));
  }

  return ids;
}
