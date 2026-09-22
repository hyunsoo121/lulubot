import { describe, it, expect, vi } from 'vitest';

// ─── 최소 in-memory Prisma 페이크 ──────────────────────────────────────────
// matchFilter.ts의 serverOnly 로직(고정 8명 임계치)만 검증한다.

interface FixtureAccount {
  id: bigint;
  userId: bigint;
}

interface FixtureStat {
  matchId: bigint;
  lolAccountId: bigint;
}

const { db, fakePrisma } = vi.hoisted(() => {
  const db: { accounts: FixtureAccount[]; stats: FixtureStat[] } = { accounts: [], stats: [] };

  const fakePrisma = {
    lolAccount: {
      findMany: async ({ where }: { where: { id: { in: bigint[] } } }) =>
        db.accounts
          .filter((a) => where.id.in.includes(a.id))
          .map((a) => ({ id: a.id, userId: a.userId })),
    },
    playerMatchStat: {
      findMany: async ({
        where,
      }: {
        where: { matchId: { in: bigint[] }; lolAccountId: { in: bigint[] } };
      }) =>
        db.stats
          .filter(
            (s) =>
              where.matchId.in.includes(s.matchId) &&
              where.lolAccountId.in.includes(s.lolAccountId),
          )
          .map((s) => ({ matchId: s.matchId, lolAccountId: s.lolAccountId })),
    },
    matchRecord: {
      findMany: async () => [],
    },
  };

  return { db, fakePrisma };
});

vi.mock('../lib/prisma', () => ({ default: fakePrisma }));

import {
  filterMatchIds,
  getRegisteredUserCount,
  SERVER_ONLY_MIN_PARTICIPANTS,
} from './matchFilter';

function registerAccount(accountId: bigint, userId: bigint) {
  db.accounts.push({ id: accountId, userId });
}

function playMatch(matchId: bigint, accountIds: bigint[]) {
  for (const id of accountIds) db.stats.push({ matchId, lolAccountId: id });
}

function reset() {
  db.accounts = [];
  db.stats = [];
}

describe('SERVER_ONLY_MIN_PARTICIPANTS — 고정값 8', () => {
  it('8이다 (등록 인원 수에 비례해서 낮아지지 않는다)', () => {
    expect(SERVER_ONLY_MIN_PARTICIPANTS).toBe(8);
  });
});

describe('getRegisteredUserCount — 멀티계정 중복 제거', () => {
  it('계정이 3개, 유저가 2명(한 명은 스마프 계정 2개)이면 2를 반환한다', async () => {
    reset();
    registerAccount(1n, 100n);
    registerAccount(2n, 100n); // 같은 유저의 스마프 계정
    registerAccount(3n, 300n);

    const count = await getRegisteredUserCount([1n, 2n, 3n]);
    expect(count).toBe(2);
  });

  it('계정 목록이 비어있으면 0', async () => {
    reset();
    const count = await getRegisteredUserCount([]);
    expect(count).toBe(0);
  });
});

describe('filterMatchIds({ serverOnly: true }) — 고정 8명 임계치', () => {
  it('매치 참가자 중 서버 등록 유저가 8명 미만이면 그 매치는 탈락한다', async () => {
    reset();
    for (let i = 1; i <= 10; i++) registerAccount(BigInt(i), BigInt(i * 100));
    // 7명만 참여 (기준 미달)
    playMatch(1n, [1n, 2n, 3n, 4n, 5n, 6n, 7n]);

    const accountIds = Array.from({ length: 10 }, (_, i) => BigInt(i + 1));
    const result = await filterMatchIds([1n], accountIds, { serverOnly: true });
    expect(result).toEqual([]);
  });

  it('정확히 8명이 참여하면 통과한다', async () => {
    reset();
    for (let i = 1; i <= 10; i++) registerAccount(BigInt(i), BigInt(i * 100));
    playMatch(1n, [1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n]);

    const accountIds = Array.from({ length: 10 }, (_, i) => BigInt(i + 1));
    const result = await filterMatchIds([1n], accountIds, { serverOnly: true });
    expect(result).toEqual([1n]);
  });

  it('등록 인원이 8명 미만인 서버는 어떤 매치도 통과할 수 없다 (임계치가 인원수에 맞춰 낮아지지 않음)', async () => {
    reset();
    // 등록 유저 5명뿐 — 전원이 매치에 껴도 5 < 8이라 통과 불가
    for (let i = 1; i <= 5; i++) registerAccount(BigInt(i), BigInt(i * 100));
    playMatch(1n, [1n, 2n, 3n, 4n, 5n]);

    const accountIds = Array.from({ length: 5 }, (_, i) => BigInt(i + 1));
    const result = await filterMatchIds([1n], accountIds, { serverOnly: true });
    expect(result).toEqual([]);
  });

  it('멀티계정: 계정 수가 아니라 유저 수로 8명을 센다', async () => {
    reset();
    // 유저 7명이 각각 계정 2개씩(스마프) 등록 → 계정 수는 14개지만 유저는 7명뿐 → 8명 기준 미달
    for (let i = 1; i <= 7; i++) {
      registerAccount(BigInt(i), BigInt(i * 100));
      registerAccount(BigInt(i + 100), BigInt(i * 100));
    }
    const allAccountIds = [
      ...Array.from({ length: 7 }, (_, i) => BigInt(i + 1)),
      ...Array.from({ length: 7 }, (_, i) => BigInt(i + 101)),
    ];
    // 매치엔 7명의 유저가 스마프 계정으로 참여 (계정 수로 세면 7개뿐이라 어차피 미달)
    playMatch(1n, allAccountIds.slice(0, 7));

    const result = await filterMatchIds([1n], allAccountIds, { serverOnly: true });
    expect(result).toEqual([]);
  });

  it('N=0: 서버 등록 인원이 없으면 항상 빈 배열', async () => {
    reset();
    const result = await filterMatchIds([1n], [], { serverOnly: true });
    expect(result).toEqual([]);
  });
});
