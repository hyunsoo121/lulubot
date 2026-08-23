import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── 최소 in-memory Prisma 페이크 ──────────────────────────────────────────
// titleService.ts가 실제로 사용하는 쿼리 형태(findMany/groupBy의 where/select/orderBy)만 지원한다.

interface FixtureStat {
  id: bigint;
  matchId: bigint;
  lolAccountId: bigint;
  position: string;
  isWin: boolean;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  damageDealt: number;
  damageTaken: number;
  goldEarned: number;
  visionScore: number;
  killParticipation: number;
  turretKills: number;
  firstBloodKill: boolean;
  pentaKills: number;
  quadraKills: number;
  dragonKills: number;
  baronKills: number;
  wardsPlaced: number;
  wardsKilled: number;
  controlWardsPlaced: number;
  dmgShare: number;
  goldShare: number;
  dmgPerGold: number;
  timeCCingOthers: number;
  enemyJungleMinions: number;
  objectivesStolen: number;
  healsOnTeammates: number;
  shieldOnTeammates: number;
  soloKills: number;
}

interface FixtureMatch {
  id: bigint;
  playedAt: Date;
  gameDurationSecs: number;
}

interface FixtureGuildMember {
  guildServerId: bigint;
  user: { lolAccounts: { id: bigint }[] };
}

const { db, resetDb, fakePrisma, statSeq } = vi.hoisted(() => {
  const db: {
    guildMembers: FixtureGuildMember[];
    matches: FixtureMatch[];
    matchesById: Map<bigint, FixtureMatch>;
    stats: FixtureStat[];
  } = { guildMembers: [], matches: [], matchesById: new Map(), stats: [] };

  const statSeq = { n: 0 };

  function resetDb() {
    db.guildMembers = [];
    db.matches = [];
    db.matchesById = new Map();
    db.stats = [];
    statSeq.n = 0;
  }

  function matchesWhere(row: Record<string, unknown>, where: Record<string, unknown> = {}) {
    return Object.entries(where).every(([key, cond]) => {
      const val = row[key];
      if (cond && typeof cond === 'object' && 'in' in (cond as Record<string, unknown>)) {
        const list = (cond as { in: unknown[] }).in;
        return list.some((x) => x === val);
      }
      return val === cond;
    });
  }

  function projectSelect(row: FixtureStat, select?: Record<string, unknown>) {
    if (!select) return row;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(select)) {
      if (key === 'matchRecord') {
        const m = db.matchesById.get(row.matchId)!;
        const sub = (select.matchRecord as { select: Record<string, unknown> }).select;
        const inner: Record<string, unknown> = {};
        for (const k2 of Object.keys(sub))
          inner[k2] = (m as unknown as Record<string, unknown>)[k2];
        out.matchRecord = inner;
      } else {
        out[key] = (row as unknown as Record<string, unknown>)[key];
      }
    }
    return out;
  }

  const fakePrisma = {
    userGuildServer: {
      findMany: async ({ where }: { where: { guildServerId: bigint } }) =>
        db.guildMembers.filter((g) => g.guildServerId === where.guildServerId),
    },
    matchRecord: {
      findMany: async ({
        where,
      }: {
        where: { id?: { in: bigint[] }; gameDurationSecs?: { gte?: number; lte?: number } };
      }) => {
        let rows = db.matches;
        if (where.id) rows = rows.filter((m) => where.id!.in.includes(m.id));
        if (where.gameDurationSecs?.gte != null)
          rows = rows.filter((m) => m.gameDurationSecs >= where.gameDurationSecs!.gte!);
        if (where.gameDurationSecs?.lte != null)
          rows = rows.filter((m) => m.gameDurationSecs <= where.gameDurationSecs!.lte!);
        return rows.map((m) => ({ id: m.id }));
      },
    },
    playerMatchStat: {
      findMany: async ({
        where,
        select,
        orderBy,
      }: {
        where?: Record<string, unknown>;
        select?: Record<string, unknown>;
        orderBy?: Record<string, unknown>[];
      }) => {
        let rows = db.stats.filter((r) =>
          matchesWhere(r as unknown as Record<string, unknown>, where),
        );
        if (orderBy) {
          rows = [...rows].sort((a, b) => {
            for (const ob of orderBy) {
              if (ob.lolAccountId) {
                const dir = ob.lolAccountId === 'asc' ? 1 : -1;
                if (a.lolAccountId !== b.lolAccountId)
                  return a.lolAccountId < b.lolAccountId ? -dir : dir;
              }
              const mr = ob.matchRecord as { playedAt?: string } | undefined;
              if (mr?.playedAt) {
                const dir = mr.playedAt === 'asc' ? 1 : -1;
                const ma = db.matchesById.get(a.matchId)!.playedAt.getTime();
                const mb = db.matchesById.get(b.matchId)!.playedAt.getTime();
                if (ma !== mb) return (ma - mb) * dir;
              }
            }
            return 0;
          });
        }
        return rows.map((r) => projectSelect(r, select));
      },
      groupBy: async ({
        by,
        where,
        _avg,
        _sum,
        _count,
      }: {
        by: string[];
        where?: Record<string, unknown>;
        _avg?: Record<string, boolean>;
        _sum?: Record<string, boolean>;
        _count?: Record<string, boolean>;
      }) => {
        const rows = db.stats.filter((r) =>
          matchesWhere(r as unknown as Record<string, unknown>, where),
        );
        const groupField = by[0] as keyof FixtureStat;
        const groups = new Map<FixtureStat[keyof FixtureStat], FixtureStat[]>();
        for (const r of rows) {
          const key = r[groupField];
          const arr = groups.get(key) ?? [];
          arr.push(r);
          groups.set(key, arr);
        }
        return [...groups.entries()].map(([key, arr]) => {
          const result: Record<string, unknown> = { [groupField]: key, _count: { id: arr.length } };
          if (_avg) {
            const field = Object.keys(_avg)[0] as keyof FixtureStat;
            result._avg = {
              [field]: arr.reduce((s, r) => s + (r[field] as number), 0) / arr.length,
            };
          }
          if (_sum) {
            const field = Object.keys(_sum)[0] as keyof FixtureStat;
            result._sum = { [field]: arr.reduce((s, r) => s + (r[field] as number), 0) };
          }
          void _count;
          return result;
        });
      },
    },
    userTitle: {
      deleteMany: vi.fn(async (_args: { where: { guildServerId: bigint; titleCode: string } }) => ({
        count: 0,
      })),
      createMany: vi.fn(async (_args: { data: { lolAccountId: bigint; titleCode: string }[] }) => ({
        count: 0,
      })),
      findMany: vi.fn(async (_args?: unknown) => [] as unknown[]),
    },
  };

  return { db, resetDb, fakePrisma, statSeq };
});

vi.mock('../lib/prisma', () => ({ default: fakePrisma }));

// ─── 픽스처 빌더 ────────────────────────────────────────────────────────────

function addMember(guildServerId: bigint, accountId: bigint) {
  let entry = db.guildMembers.find(
    (g) => g.guildServerId === guildServerId && g.user.lolAccounts.some((a) => a.id === accountId),
  );
  if (!entry) {
    entry = { guildServerId, user: { lolAccounts: [{ id: accountId }] } };
    db.guildMembers.push(entry);
  }
}

// 서버기반(8/10 참가자) 필터를 통과시키기 위한 필러 참가자 풀.
// 한 매치에 8명씩 채워 넣되, 풀 크기를 FILLERS_PER_MATCH와 서로소인 소수로 잡고
// 라운드로빈으로 순환시켜, 같은 필러가 항상 같은 승/패 슬롯에 고정되지 않도록 한다.
// (풀 크기가 8의 배수였을 때는 특정 필러가 매번 승리만/패배만 해서 100% 승률·긴 연패
//  스트릭을 만들어 MVP/FEEDER의 1위를 가로채는 문제가 있었음)
const FILLER_POOL: bigint[] = Array.from({ length: 41 }, (_, i) => BigInt(9000 + i));
const FILLERS_PER_MATCH = 8;
let fillerCursor = 0;

function addMatch(id: bigint, opts: { playedAt?: Date; gameDurationSecs?: number } = {}) {
  const m: FixtureMatch = {
    id,
    playedAt: opts.playedAt ?? new Date(2026, 0, 1),
    gameDurationSecs: opts.gameDurationSecs ?? 1500,
  };
  db.matches.push(m);
  db.matchesById.set(id, m);

  for (let k = 0; k < FILLERS_PER_MATCH; k++) {
    const fillerId = FILLER_POOL[fillerCursor % FILLER_POOL.length];
    // 풀 크기(41)가 홀수라 같은 필러를 다시 뽑을 때마다 cursor의 홀짝이 뒤집혀
    // 승/패가 매 등장마다 번갈아 나온다 (연승/연패 스트릭 방지)
    const isWin = fillerCursor % 2 === 0;
    fillerCursor++;
    addMember(GUILD_A, fillerId);
    addStat(id, fillerId, {
      kills: 1,
      deaths: 2,
      assists: 1,
      cs: 50,
      damageDealt: 1000,
      damageTaken: 1000,
      goldEarned: 1000,
      visionScore: 5,
      killParticipation: 0.3,
      isWin,
    });
  }

  return m;
}

function addStat(matchId: bigint, lolAccountId: bigint, overrides: Partial<FixtureStat> = {}) {
  statSeq.n++;
  const stat: FixtureStat = {
    id: BigInt(statSeq.n),
    matchId,
    lolAccountId,
    position: 'TOP',
    isWin: false,
    kills: 0,
    deaths: 0,
    assists: 0,
    cs: 0,
    damageDealt: 0,
    damageTaken: 0,
    goldEarned: 0,
    visionScore: 0,
    killParticipation: 0,
    turretKills: 0,
    firstBloodKill: false,
    pentaKills: 0,
    quadraKills: 0,
    dragonKills: 0,
    baronKills: 0,
    wardsPlaced: 0,
    wardsKilled: 0,
    controlWardsPlaced: 0,
    dmgShare: 0,
    goldShare: 0,
    dmgPerGold: 0,
    timeCCingOthers: 0,
    enemyJungleMinions: 0,
    objectivesStolen: 0,
    healsOnTeammates: 0,
    shieldOnTeammates: 0,
    soloKills: 0,
    ...overrides,
  };
  db.stats.push(stat);
  return stat;
}

// ─── 테스트 ─────────────────────────────────────────────────────────────────

import {
  recalculateTitles,
  getTitleRanking,
  topAllBy,
  buildPerMinMap,
  TITLE_DEFINITIONS,
} from './titleService';

const GUILD_A = 1000n;

beforeEach(() => {
  resetDb();
  fakePrisma.userTitle.deleteMany.mockClear();
  fakePrisma.userTitle.createMany.mockClear();
});

describe('topAllBy (순수 함수)', () => {
  it('동점자 전원을 반환한다', () => {
    const rows = [
      { lolAccountId: 1n, value: 5 },
      { lolAccountId: 2n, value: 5 },
      { lolAccountId: 3n, value: 3 },
    ];
    const holders = topAllBy(rows, 'desc');
    expect(holders.map((h) => h.lolAccountId).sort()).toEqual([1n, 2n]);
  });

  it('desc 정렬에서 1위 값이 0이면 아무도 받지 않는다', () => {
    const rows = [
      { lolAccountId: 1n, value: 0 },
      { lolAccountId: 2n, value: 0 },
    ];
    expect(topAllBy(rows, 'desc')).toEqual([]);
  });

  it('asc 정렬에서는 값이 0이어도 정상적으로 수상한다 (예: 평균 데스 0)', () => {
    const rows = [
      { lolAccountId: 1n, value: 0 },
      { lolAccountId: 2n, value: 2 },
    ];
    const holders = topAllBy(rows, 'asc');
    expect(holders.map((h) => h.lolAccountId)).toEqual([1n]);
  });

  it('빈 배열이면 빈 배열을 반환한다', () => {
    expect(topAllBy([], 'desc')).toEqual([]);
  });
});

describe('buildPerMinMap (순수 함수)', () => {
  it('분당 값을 합계/게임시간(분)으로 계산한다', () => {
    const stats = [
      { lolAccountId: 1n, damageDealt: 600, matchRecord: { gameDurationSecs: 600 } }, // 10분, 600딜 = 60/분
      { lolAccountId: 1n, damageDealt: 600, matchRecord: { gameDurationSecs: 600 } },
      { lolAccountId: 1n, damageDealt: 600, matchRecord: { gameDurationSecs: 600 } },
    ] as Parameters<typeof buildPerMinMap>[0];
    const rows = buildPerMinMap(stats, 'damageDealt', 3);
    expect(rows).toEqual([{ lolAccountId: 1n, value: 60 }]);
  });

  it('minGames 미만이면 제외한다', () => {
    const stats = [
      { lolAccountId: 1n, damageDealt: 600, matchRecord: { gameDurationSecs: 600 } },
      { lolAccountId: 1n, damageDealt: 600, matchRecord: { gameDurationSecs: 600 } },
    ] as Parameters<typeof buildPerMinMap>[0];
    expect(buildPerMinMap(stats, 'damageDealt', 3)).toEqual([]);
  });
});

describe('크로스-서버 오염 회귀 테스트', () => {
  // Guild A: 계정 1~5. 계정 6은 Guild A 미소속(타 서버 등록 계정)인데
  // 매치 M1에 같이 참여함 — 이 참가자가 Guild A의 칭호를 가져가면 안 된다.
  const ACCOUNTS = [1n, 2n, 3n, 4n, 5n];
  const OUTSIDER = 6n;

  beforeEach(() => {
    for (const id of ACCOUNTS) addMember(GUILD_A, id);
    // M1: outsider가 낀 매치. outsider가 압도적인 킬 수로 학살자를 노림.
    addMatch(100n, { playedAt: new Date(2026, 0, 1) });
    for (const id of ACCOUNTS) addStat(100n, id, { kills: 3 });
    addStat(100n, OUTSIDER, { kills: 99 });

    // Guild A 멤버들에게 최소 3게임을 채워주기 위한 추가 매치 2개 (outsider는 참여 안 함)
    addMatch(101n, { playedAt: new Date(2026, 0, 2) });
    addMatch(102n, { playedAt: new Date(2026, 0, 3) });
    for (const id of ACCOUNTS) {
      addStat(101n, id, { kills: 2 });
      addStat(102n, id, { kills: 4 });
    }
  });

  it('recalculateTitles가 서버 미소속 계정에게 칭호를 주지 않는다', async () => {
    await recalculateTitles(GUILD_A);

    const call = fakePrisma.userTitle.createMany.mock.calls.find(
      (c: unknown[]) => (c[0] as { data: { titleCode: string }[] }).data[0]?.titleCode === '학살자',
    );
    expect(call).toBeDefined();
    const holderIds = (call![0] as { data: { lolAccountId: bigint }[] }).data.map(
      (d) => d.lolAccountId,
    );
    expect(holderIds).not.toContain(OUTSIDER);
    // outsider가 없으면 4kills 평균인 계정들이 최고 평균(3게임 평균=3)을 가져야 함
    expect(holderIds.length).toBeGreaterThan(0);
  });

  it('getTitleRanking도 서버 미소속 계정을 순위에 포함하지 않는다', async () => {
    const ranking = await getTitleRanking(GUILD_A, '학살자');
    const ids = ranking.map((r) => r.lolAccountId);
    expect(ids).not.toContain(OUTSIDER);
    for (const id of ACCOUNTS) expect(ids).toContain(id);
  });
});

describe('최소 3게임 기준 (countCondition 계열 칭호)', () => {
  const MANY_GAMES = 8n; // 3게임, 그중 1번 퍼블
  const ONE_GAME = 7n; // 1게임뿐인데 그 판이 퍼블

  beforeEach(() => {
    addMember(GUILD_A, MANY_GAMES);
    addMember(GUILD_A, ONE_GAME);

    addMatch(200n);
    addMatch(201n);
    addMatch(202n);
    addStat(200n, MANY_GAMES, { firstBloodKill: true });
    addStat(201n, MANY_GAMES, {});
    addStat(202n, MANY_GAMES, {});

    addStat(200n, ONE_GAME, { firstBloodKill: true });
  });

  it('총 3게임 미만인 계정은 조건을 만족해도 후보에서 제외된다', async () => {
    const ranking = await getTitleRanking(GUILD_A, '퍼블전문가');
    const ids = ranking.map((r) => r.lolAccountId);
    expect(ids).toContain(MANY_GAMES);
    expect(ids).not.toContain(ONE_GAME);
  });
});

describe('포지션 기반 칭호', () => {
  const TOP_PLAYER = 10n;
  const OFF_POSITION_PLAYER = 11n;

  beforeEach(() => {
    addMember(GUILD_A, TOP_PLAYER);
    addMember(GUILD_A, OFF_POSITION_PLAYER);

    for (let i = 0; i < 3; i++) {
      const matchId = BigInt(300 + i);
      addMatch(matchId);
      addStat(matchId, TOP_PLAYER, { position: 'TOP', turretKills: 5 });
      addStat(matchId, OFF_POSITION_PLAYER, { position: 'JUNGLE', turretKills: 10 });
    }
  });

  it('TOP 포지션 칭호는 JUNGLE만 플레이한 계정을 포함하지 않는다', async () => {
    const ranking = await getTitleRanking(GUILD_A, '고속도로건설자');
    const ids = ranking.map((r) => r.lolAccountId);
    expect(ids[0]).toBe(TOP_PLAYER);
    expect(ids).not.toContain(OFF_POSITION_PLAYER);
  });
});

describe('전체 57개 칭호 — 정확한 승자 배정 + recalc/ranking 일치성', () => {
  // MVP: 모든 지표를 극단적으로 높게(데스는 0으로 낮게) 설정 — 사실상 모든 칭호의 우승 후보
  // FEEDER: 데스만 극단적으로 높고 전패 — 흑백모니터/연패왕 전용
  // GHOST: 킬관여율만 극단적으로 낮음 — 투명인간 전용
  const MVP = 100n;
  const FEEDER = 101n;
  const GHOST = 102n;

  const MVP_RICH: Partial<FixtureStat> = {
    kills: 12,
    deaths: 0,
    assists: 10,
    cs: 220,
    damageDealt: 25000,
    damageTaken: 20000,
    goldEarned: 15000,
    visionScore: 40,
    killParticipation: 0.8,
    turretKills: 3,
    firstBloodKill: true,
    pentaKills: 1,
    quadraKills: 1,
    dragonKills: 2,
    baronKills: 1,
    wardsPlaced: 10,
    wardsKilled: 5,
    controlWardsPlaced: 4,
    dmgShare: 0.4,
    goldShare: 0.3,
    dmgPerGold: 1.8,
    timeCCingOthers: 20,
    enemyJungleMinions: 6,
    objectivesStolen: 1,
    healsOnTeammates: 2000,
    shieldOnTeammates: 1500,
    soloKills: 2,
    isWin: true,
  };

  const FEEDER_LOW: Partial<FixtureStat> = {
    kills: 1,
    deaths: 10,
    assists: 1,
    cs: 50,
    damageDealt: 3000,
    damageTaken: 5000,
    goldEarned: 5000,
    visionScore: 5,
    killParticipation: 0.2,
    dmgShare: 0.05,
    goldShare: 0.05,
    dmgPerGold: 0.5,
    isWin: false,
    position: 'TOP',
  };

  const GHOST_LOW_KP: Partial<FixtureStat> = {
    kills: 3,
    deaths: 3,
    assists: 2,
    cs: 80,
    damageDealt: 6000,
    damageTaken: 6000,
    goldEarned: 6000,
    visionScore: 10,
    killParticipation: 0.05, // 투명인간 대상 — 최저 킬관여율
    dmgShare: 0.1,
    goldShare: 0.1,
    dmgPerGold: 0.6,
    position: 'JUNGLE',
  };

  let seq = 0;
  const nextMatchId = () => BigInt(10000 + seq++);
  const nextDay = (n: number) => new Date(2026, 0, 1 + n);

  beforeEach(() => {
    addMember(GUILD_A, MVP);
    addMember(GUILD_A, FEEDER);
    addMember(GUILD_A, GHOST);

    let day = 0;
    // MVP: 5개 포지션 × 3게임(30분) — 포지션별 칭호 전부 석권
    for (const position of ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY']) {
      for (let i = 0; i < 3; i++) {
        const matchId = nextMatchId();
        addMatch(matchId, { playedAt: nextDay(day++), gameDurationSecs: 1800 });
        addStat(matchId, MVP, { ...MVP_RICH, position });
      }
    }
    // MVP: 40분 이상(끈기왕용) 3게임
    for (let i = 0; i < 3; i++) {
      const matchId = nextMatchId();
      addMatch(matchId, { playedAt: nextDay(day++), gameDurationSecs: 2700 });
      addStat(matchId, MVP, { ...MVP_RICH, position: 'MIDDLE' });
    }
    // MVP: 25분 이하(속전속결용) 3게임
    for (let i = 0; i < 3; i++) {
      const matchId = nextMatchId();
      addMatch(matchId, { playedAt: nextDay(day++), gameDurationSecs: 1200 });
      addStat(matchId, MVP, { ...MVP_RICH, position: 'MIDDLE' });
    }

    // FEEDER: 5연패, TOP만 플레이
    for (let i = 0; i < 5; i++) {
      const matchId = nextMatchId();
      addMatch(matchId, { playedAt: nextDay(day++), gameDurationSecs: 1800 });
      addStat(matchId, FEEDER, FEEDER_LOW);
    }

    // GHOST: 3게임, JUNGLE만 플레이, 1승 2패 (신인왕 후보에서 자연 배제)
    for (let i = 0; i < 3; i++) {
      const matchId = nextMatchId();
      addMatch(matchId, { playedAt: nextDay(day++), gameDurationSecs: 1800 });
      addStat(matchId, GHOST, { ...GHOST_LOW_KP, isWin: i === 0 });
    }
  });

  const EXPECTED_WINNER: Record<string, bigint> = {
    흑백모니터: FEEDER,
    연패왕: FEEDER,
    투명인간: GHOST,
  };

  it.each(Object.keys(TITLE_DEFINITIONS))('%s — 예상 계정이 1위를 차지한다', async (code) => {
    const expected = EXPECTED_WINNER[code] ?? MVP;

    const ranking = await getTitleRanking(GUILD_A, code);
    expect(ranking.length, `${code}: 순위 데이터가 비어있음`).toBeGreaterThan(0);
    expect(ranking[0].lolAccountId, `${code}: 1위 계정이 예상과 다름`).toBe(expected);
  });

  it('recalculateTitles가 저장하는 우승자가 getTitleRanking의 1위와 일치한다 (모든 칭호)', async () => {
    await recalculateTitles(GUILD_A);

    for (const code of Object.keys(TITLE_DEFINITIONS)) {
      const call = fakePrisma.userTitle.createMany.mock.calls.find(
        (c) => c[0].data[0]?.titleCode === code,
      );
      const expected = EXPECTED_WINNER[code] ?? MVP;
      expect(call, `${code}: createMany 호출을 찾을 수 없음`).toBeDefined();
      const holderIds = call![0].data.map((d) => d.lolAccountId);
      expect(holderIds, `${code}: 저장된 우승자가 예상과 다름`).toContain(expected);
      expect(holderIds).toHaveLength(1);
    }
  });

  it('연승왕: 21연승이 정확히 집계된다', async () => {
    const ranking = await getTitleRanking(GUILD_A, '연승왕');
    expect(ranking[0]).toEqual({ lolAccountId: MVP, value: 21 });
  });

  it('신인왕: 첫 10게임 100% 승률이 정확히 집계된다', async () => {
    const ranking = await getTitleRanking(GUILD_A, '신인왕');
    expect(ranking[0]).toEqual({ lolAccountId: MVP, value: 1 });
  });

  it('오브젝트마스터: 정글 드래곤+바론 합산이 정확히 집계된다 (3게임 × 3마리)', async () => {
    const ranking = await getTitleRanking(GUILD_A, '오브젝트마스터');
    expect(ranking[0]).toEqual({ lolAccountId: MVP, value: 9 });
  });

  it('개근상: 게임 수가 가장 많은 계정이 1위다', async () => {
    const ranking = await getTitleRanking(GUILD_A, '개근상');
    expect(ranking[0]).toEqual({ lolAccountId: MVP, value: 21 });
  });
});
