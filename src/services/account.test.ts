import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── 최소 in-memory Prisma 페이크 ──────────────────────────────────────────
// registerAccount의 puuid 레이스 컨디션 처리(create → 유니크 충돌 시 조건부 claim)만 검증한다.

interface FixtureUser {
  id: bigint;
  discordUserId: bigint;
}

interface FixtureLolAccount {
  id: bigint;
  puuid: string;
  userId: bigint | null;
  gameName: string;
  tagLine: string;
}

const { db, resetDb, fakePrisma, forceFindUniqueNullOnce } = vi.hoisted(() => {
  const db: { users: FixtureUser[]; accounts: FixtureLolAccount[]; guildLinks: Set<string> } = {
    users: [],
    accounts: [],
    guildLinks: new Set(),
  };

  let userSeq = 0;
  let accountSeq = 0;
  // 테스트에서 "체크 시점엔 없었는데 create 시점엔 이미 있는" TOCTOU 레이스를 흉내내기 위한 스위치.
  // true인 동안 findUnique(puuid)는 실제로는 존재해도 null을 반환한다(딱 1회).
  const forceFindUniqueNullOnce = { on: false };

  function resetDb() {
    db.users = [];
    db.accounts = [];
    db.guildLinks = new Set();
    userSeq = 0;
    accountSeq = 0;
    forceFindUniqueNullOnce.on = false;
  }

  function withUser(a: FixtureLolAccount | undefined) {
    if (!a) return null;
    const user = a.userId ? db.users.find((u) => u.id === a.userId) : null;
    return { ...a, user: user ?? null };
  }

  const fakePrisma = {
    user: {
      upsert: async ({
        where,
        create,
      }: {
        where: { discordUserId: bigint };
        create: { discordUserId: bigint };
      }) => {
        let user = db.users.find((u) => u.discordUserId === where.discordUserId);
        if (!user) {
          userSeq++;
          user = { id: BigInt(userSeq), discordUserId: create.discordUserId };
          db.users.push(user);
        }
        return user;
      },
    },
    lolAccount: {
      findUnique: async ({ where }: { where: { puuid: string } }) => {
        if (forceFindUniqueNullOnce.on) {
          forceFindUniqueNullOnce.on = false;
          return null;
        }
        return withUser(db.accounts.find((a) => a.puuid === where.puuid));
      },
      findUniqueOrThrow: async ({ where }: { where: { puuid: string } }) => {
        const found = withUser(db.accounts.find((a) => a.puuid === where.puuid));
        if (!found) throw new Error('not found');
        return found;
      },
      count: async ({ where }: { where: { userId: bigint } }) =>
        db.accounts.filter((a) => a.userId === where.userId).length,
      create: async ({
        data,
      }: {
        data: { userId: bigint; puuid: string; gameName: string; tagLine: string };
      }) => {
        if (db.accounts.some((a) => a.puuid === data.puuid)) {
          const { Prisma } = await import('../generated/prisma');
          throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed on puuid', {
            code: 'P2002',
            clientVersion: 'test',
          });
        }
        accountSeq++;
        const account: FixtureLolAccount = { id: BigInt(accountSeq), ...data };
        db.accounts.push(account);
        return account;
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: { puuid: string; userId: null };
        data: { userId: bigint; gameName: string; tagLine: string };
      }) => {
        const account = db.accounts.find((a) => a.puuid === where.puuid && a.userId === null);
        if (!account) return { count: 0 };
        account.userId = data.userId;
        account.gameName = data.gameName;
        account.tagLine = data.tagLine;
        return { count: 1 };
      },
    },
    guildServer: {
      upsert: async () => ({}),
    },
    userGuildServer: {
      upsert: async ({ create }: { create: { userId: bigint; guildServerId: bigint } }) => {
        db.guildLinks.add(`${create.userId}:${create.guildServerId}`);
        return {};
      },
    },
  };

  return { db, resetDb, fakePrisma, forceFindUniqueNullOnce };
});

vi.mock('../lib/prisma', () => ({ default: fakePrisma }));
vi.mock('./riot', () => ({
  getAccountByRiotId: vi.fn(async (gameName: string, tagLine: string) => ({
    puuid: `puuid-${gameName}-${tagLine}`,
    gameName,
    tagLine,
  })),
}));

import { registerAccount } from './account';

beforeEach(() => resetDb());

describe('registerAccount — 정상 경로', () => {
  it('신규 puuid는 그대로 생성된다', async () => {
    const account = await registerAccount(1n, '롤닉', 'KR1');
    expect(account.puuid).toBe('puuid-롤닉-KR1');
    expect(account.userId).toBe(1n);
  });

  it('본인이 이미 등록한 계정을 다시 등록하면 "이미 등록된 계정" 에러', async () => {
    await registerAccount(1n, '롤닉', 'KR1');
    await expect(registerAccount(1n, '롤닉', 'KR1')).rejects.toThrow('이미 등록된 계정입니다.');
  });

  it('다른 유저가 이미 등록한 계정이면(레이스 없이도) 거부된다', async () => {
    await registerAccount(1n, '롤닉', 'KR1');
    await expect(registerAccount(2n, '롤닉', 'KR1')).rejects.toThrow(
      '이미 다른 유저가 등록한 계정입니다.',
    );
  });
});

describe('registerAccount — 레이스 컨디션 (TOCTOU)', () => {
  it('체크 직후 다른 유저가 먼저 가로챘다면, 조용히 덮어쓰지 않고 명확히 거부한다', async () => {
    // 유저 2가 puuid-롤닉-KR1을 이미 선점한 상태를 만들어둔다
    const winner = await registerAccount(2n, '롤닉', 'KR1');

    // 유저 1의 findUnique 체크 시점엔 아직 아무도 없었던 것처럼(TOCTOU 창) 흉내낸다
    forceFindUniqueNullOnce.on = true;

    await expect(registerAccount(1n, '롤닉', 'KR1')).rejects.toThrow(
      '이미 다른 유저가 등록한 계정입니다.',
    );

    // 유저 2의 소유권이 그대로 유지돼야 한다 (가로채기 성공하면 안 됨)
    const account = db.accounts.find((a) => a.puuid === 'puuid-롤닉-KR1');
    expect(account?.userId).toBe(winner.userId);
  });

  it('체크 직후 해제된(userId: null) 계정을 다른 유저가 먼저 재점유했다면, 나중 요청은 거부된다', async () => {
    const original = await registerAccount(2n, '롤닉', 'KR1');
    const account = db.accounts.find((a) => a.puuid === 'puuid-롤닉-KR1')!;
    expect(account.userId).toBe(original.userId);
    account.userId = null; // 유저 2가 계정 해제(계정삭제)했다고 가정

    // 유저 3이 먼저 재점유
    const reclaimer = await registerAccount(3n, '롤닉', 'KR1');

    // 유저 1의 체크 시점엔 아직 null(무주공산)이었던 것처럼 흉내낸다
    forceFindUniqueNullOnce.on = true;

    await expect(registerAccount(1n, '롤닉', 'KR1')).rejects.toThrow(
      '이미 다른 유저가 등록한 계정입니다.',
    );
    expect(db.accounts.find((a) => a.puuid === 'puuid-롤닉-KR1')?.userId).toBe(reclaimer.userId);
  });

  it('해제된 계정을 놓고 경합했는데 내가 이겼다면(claim 성공) 정상적으로 내 소유가 된다', async () => {
    await registerAccount(2n, '롤닉', 'KR1');
    const account = db.accounts.find((a) => a.puuid === 'puuid-롤닉-KR1')!;
    account.userId = null;

    forceFindUniqueNullOnce.on = true;
    const result = await registerAccount(1n, '롤닉', 'KR1');
    const me = db.users.find((u) => u.discordUserId === 1n);
    expect(result.userId).toBe(me?.id);
  });

  it('본인이 같은 요청을 거의 동시에 두 번 보낸 경우(자기 자신과의 경합)는 에러 없이 그대로 성공 처리된다', async () => {
    // "동시에 도착한 첫 번째 요청"이 이미 처리돼서 내가 이미 소유자인 상태를 만든다
    await registerAccount(1n, '롤닉', 'KR1');

    // 두 번째 요청은 체크 시점엔 아직 없었던 것처럼 흉내내지만, create에서 유니크 충돌 →
    // claim 시도 시 이미 나 자신이 소유자라 에러 없이 그대로 반환돼야 한다
    forceFindUniqueNullOnce.on = true;
    const result = await registerAccount(1n, '롤닉', 'KR1');
    expect(result.userId).toBe(1n);
  });
});
