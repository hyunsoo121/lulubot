import prisma from '../lib/prisma';

export interface TitleInfo {
  code: string;
  name: string;
  description: string;
  icon: string;
  formatValue: (v: number) => string;
}

export interface TitleHolder {
  lolAccountId: bigint;
  value: number;
}

type PrismaGroupRow = {
  lolAccountId: bigint;
  _count: { id: number };
} & Record<string, unknown>;

const avg1 = (v: number) => `평균 ${v.toFixed(1)}`;
const cnt = (v: number) => `${Math.round(v)}회`;
const games = (v: number) => `${Math.round(v)}판`;
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const streak = (v: number) => `${Math.round(v)}연속`;
const perMin = (v: number) => `${v.toFixed(1)}/분`;
const perMin3 = (v: number) => `${v.toFixed(3)}/분`;
const perMinDmg = (v: number) => `${Math.round(v).toLocaleString()}/분`;
const share = (v: number) => `${(v * 100).toFixed(1)}%`;

export const TITLE_DEFINITIONS: Record<string, TitleInfo> = {
  // 전투
  학살자: {
    code: '학살자',
    name: '학살자',
    description: '평균 킬 1위',
    icon: '⚔️',
    formatValue: avg1,
  },
  생존왕: {
    code: '생존왕',
    name: '생존왕',
    description: '평균 데스 최소',
    icon: '🛡️',
    formatValue: avg1,
  },
  킹메이커: {
    code: '킹메이커',
    name: '킹메이커',
    description: '평균 어시스트 1위',
    icon: '👑',
    formatValue: avg1,
  },
  퍼블전문가: {
    code: '퍼블전문가',
    name: '퍼블전문가',
    description: '퍼스트블러드 횟수 1위',
    icon: '🩸',
    formatValue: cnt,
  },
  펜타킬러: {
    code: '펜타킬러',
    name: '펜타킬러',
    description: '펜타킬 횟수 1위',
    icon: '💥',
    formatValue: cnt,
  },
  쿼드라킬러: {
    code: '쿼드라킬러',
    name: '쿼드라킬러',
    description: '쿼드라킬 횟수 1위',
    icon: '🔥',
    formatValue: cnt,
  },
  // 딜/탱
  DPM머신: {
    code: 'DPM머신',
    name: 'DPM머신',
    description: '분당 딜량 1위',
    icon: '💢',
    formatValue: perMinDmg,
  },
  샌드백: {
    code: '샌드백',
    name: '샌드백',
    description: '분당 받은 피해 1위',
    icon: '🪨',
    formatValue: perMinDmg,
  },
  철거왕: {
    code: '철거왕',
    name: '철거왕',
    description: '평균 포탑 파괴 횟수 1위',
    icon: '🏗️',
    formatValue: avg1,
  },
  // 오브젝트
  용사냥꾼: {
    code: '용사냥꾼',
    name: '용사냥꾼',
    description: '드래곤 처치 횟수 1위',
    icon: '🐉',
    formatValue: cnt,
  },
  바론사냥꾼: {
    code: '바론사냥꾼',
    name: '바론사냥꾼',
    description: '바론 처치 횟수 1위',
    icon: '👹',
    formatValue: cnt,
  },
  // CS/경제
  CS왕: { code: 'CS왕', name: 'CS왕', description: '분당 CS 1위', icon: '🌾', formatValue: perMin },
  골드킹: {
    code: '골드킹',
    name: '골드킹',
    description: '분당 골드 획득 1위',
    icon: '💰',
    formatValue: perMinDmg,
  },
  // 시야
  만물의눈: {
    code: '만물의눈',
    name: '만물의 눈',
    description: '분당 시야점수 1위',
    icon: '👁️',
    formatValue: perMin,
  },
  와드장인: {
    code: '와드장인',
    name: '와드장인',
    description: '분당 와드 설치 1위',
    icon: '🔦',
    formatValue: perMin3,
  },
  청소부: {
    code: '청소부',
    name: '청소부',
    description: '분당 와드 제거 1위',
    icon: '🧹',
    formatValue: perMin3,
  },
  타임스토프: {
    code: '타임스토프',
    name: '타임스토프',
    description: '분당 CC시간 1위',
    icon: '⏱️',
    formatValue: perMin,
  },
  // 기타
  투명인간: {
    code: '투명인간',
    name: '투명인간',
    description: '평균 킬관여율 최하위',
    icon: '👻',
    formatValue: pct,
  },
  솔로킹: {
    code: '솔로킹',
    name: '솔로킹',
    description: '솔로킬 횟수 1위',
    icon: '🗡️',
    formatValue: cnt,
  },
  흑백모니터: {
    code: '흑백모니터',
    name: '흑백모니터',
    description: '평균 데스 1위',
    icon: '💀',
    formatValue: avg1,
  },
  불사신: {
    code: '불사신',
    name: '불사신',
    description: 'KDA Perfect로 이긴 횟수 1위',
    icon: '✨',
    formatValue: games,
  },
  개근상: {
    code: '개근상',
    name: '개근상',
    description: '가장 많은 게임 수',
    icon: '🎖️',
    formatValue: games,
  },
  연승왕: {
    code: '연승왕',
    name: '연승왕',
    description: '최장 연승 기록',
    icon: '🏆',
    formatValue: streak,
  },
  연패왕: {
    code: '연패왕',
    name: '연패왕',
    description: '최장 연패 기록',
    icon: '📉',
    formatValue: streak,
  },
  끈기왕: {
    code: '끈기왕',
    name: '끈기왕',
    description: '40분 이상 게임에서 이긴 횟수 1위',
    icon: '⏳',
    formatValue: games,
  },
  속전속결: {
    code: '속전속결',
    name: '속전속결',
    description: '25분 이하 게임에서 이긴 횟수 1위',
    icon: '⚡',
    formatValue: games,
  },
  신인왕: {
    code: '신인왕',
    name: '신인왕',
    description: '첫 10게임 승률 1위',
    icon: '🌟',
    formatValue: pct,
  },
  // 탑
  TOPKING: {
    code: 'TOPKING',
    name: 'TOPKING',
    description: '탑 포지션 승률 1위',
    icon: '🏅',
    formatValue: pct,
  },
  전사왕: {
    code: '전사왕',
    name: '전사왕',
    description: '탑 킬관여율 1위',
    icon: '⚡',
    formatValue: pct,
  },
  고기방패: {
    code: '고기방패',
    name: '고기방패',
    description: '탑 분당 받은 피해 1위',
    icon: '🛡️',
    formatValue: perMinDmg,
  },
  고속도로건설자: {
    code: '고속도로건설자',
    name: '고속도로건설자',
    description: '탑 포탑 파괴 1위',
    icon: '🔨',
    formatValue: avg1,
  },
  라인전의악마: {
    code: '라인전의악마',
    name: '라인전의 악마',
    description: '탑 솔로킬 1위',
    icon: '😈',
    formatValue: cnt,
  },
  // 정글
  JUGKING: {
    code: 'JUGKING',
    name: 'JUGKING',
    description: '정글 포지션 승률 1위',
    icon: '🏅',
    formatValue: pct,
  },
  포식자: {
    code: '포식자',
    name: '포식자',
    description: '정글 킬관여율 1위',
    icon: '🦁',
    formatValue: pct,
  },
  오브젝트마스터: {
    code: '오브젝트마스터',
    name: '오브젝트마스터',
    description: '정글 드래곤+바론 처치 합산 1위',
    icon: '🎮',
    formatValue: cnt,
  },
  작전명왕호야: {
    code: '작전명왕호야',
    name: '작전명왕호야',
    description: '정글 오브젝트 스틸 1위',
    icon: '🥷',
    formatValue: cnt,
  },
  대도둑: {
    code: '대도둑',
    name: '대도둑',
    description: '정글 분당 카정 1위',
    icon: '🌲',
    formatValue: perMin,
  },
  // 미드
  MIDKING: {
    code: 'MIDKING',
    name: 'MIDKING',
    description: '미드 포지션 승률 1위',
    icon: '🏅',
    formatValue: pct,
  },
  황족: {
    code: '황족',
    name: '황족',
    description: '미드 킬관여율 1위',
    icon: '👑',
    formatValue: pct,
  },
  미드DPM: {
    code: '미드DPM',
    name: '미드DPM',
    description: '미드 분당 딜 1위',
    icon: '💢',
    formatValue: perMinDmg,
  },
  로밍킹: {
    code: '로밍킹',
    name: '로밍킹',
    description: '미드 평균 어시스트 1위',
    icon: '🏃',
    formatValue: avg1,
  },
  미드솔로킬러: {
    code: '미드솔로킬러',
    name: '미드솔로킬러',
    description: '미드 솔로킬 횟수 1위',
    icon: '🗡️',
    formatValue: cnt,
  },
  // 원딜
  ADKING: {
    code: 'ADKING',
    name: 'ADKING',
    description: '원딜 포지션 승률 1위',
    icon: '🏅',
    formatValue: pct,
  },
  해결사: {
    code: '해결사',
    name: '해결사',
    description: '원딜 킬관여율 1위',
    icon: '🎯',
    formatValue: pct,
  },
  금수저: {
    code: '금수저',
    name: '금수저',
    description: '원딜 분당 CS 1위',
    icon: '🥄',
    formatValue: perMin,
  },
  평타싸개: {
    code: '평타싸개',
    name: '평타싸개',
    description: '원딜 분당 딜 1위',
    icon: '🏹',
    formatValue: perMinDmg,
  },
  존윅: {
    code: '존윅',
    name: '존윅',
    description: '원딜 평균 데스 최소',
    icon: '🕶️',
    formatValue: avg1,
  },
  // 서폿
  SUPKING: {
    code: 'SUPKING',
    name: 'SUPKING',
    description: '서폿 포지션 승률 1위',
    icon: '🏅',
    formatValue: pct,
  },
  그림자: {
    code: '그림자',
    name: '그림자',
    description: '서폿 킬관여율 1위',
    icon: '🌑',
    formatValue: pct,
  },
  와드싸개: {
    code: '와드싸개',
    name: '와드싸개',
    description: '서폿 분당 시야점수 1위',
    icon: '🔭',
    formatValue: perMin3,
  },
  경호원: {
    code: '경호원',
    name: '경호원',
    description: '서폿 분당 실드 1위',
    icon: '🛡️',
    formatValue: perMinDmg,
  },
  베이비시터: {
    code: '베이비시터',
    name: '베이비시터',
    description: '서폿 분당 힐 1위',
    icon: '💊',
    formatValue: perMinDmg,
  },
  // 핑와
  핑와장인: {
    code: '핑와장인',
    name: '핑와장인',
    description: '분당 제어 와드 설치 1위',
    icon: '📡',
    formatValue: perMin3,
  },
  // 딜/골드 비율
  딜폭군: {
    code: '딜폭군',
    name: '딜폭군',
    description: '팀 내 딜 비율(DMG%) 1위',
    icon: '💣',
    formatValue: share,
  },
  금고: {
    code: '금고',
    name: '금고',
    description: '팀 내 골드 비율(Gold%) 1위',
    icon: '🏦',
    formatValue: share,
  },
  골드효율: {
    code: '골드효율',
    name: '골드효율',
    description: '골드당 딜 비율 1위',
    icon: '⚗️',
    formatValue: (v: number) => `${v.toFixed(2)}딜/골드`,
  },
};

// ─── helpers ────────────────────────────────────────────────────────────────

/** 서버에 속한 유저들의 lolAccountId 목록 */
async function getServerAccountIds(guildServerId: bigint): Promise<bigint[]> {
  const entries = await prisma.userGuildServer.findMany({
    where: { guildServerId },
    include: { user: { include: { lolAccounts: true } } },
  });
  return entries.flatMap((e) => e.user.lolAccounts.map((a) => a.id));
}

/** 서버 유저들이 참여한 매치 ID 목록 */
async function getServerMatchIds(guildServerId: bigint): Promise<bigint[]> {
  const accountIds = await getServerAccountIds(guildServerId);
  if (accountIds.length === 0) return [];

  const stats = await prisma.playerMatchStat.findMany({
    where: { lolAccountId: { in: accountIds } },
    select: { matchId: true },
    distinct: ['matchId'],
  });
  return stats.map((s) => s.matchId);
}

type GroupRow = { lolAccountId: bigint; value: number };

/** groupBy 없이 집계: 서버 매치에 참여한 계정별로 특정 값 합산 또는 평균 */
async function aggregateByAccount(
  matchIds: bigint[],
  field: string,
  agg: 'avg' | 'sum',
  where: Record<string, unknown> = {},
): Promise<GroupRow[]> {
  if (matchIds.length === 0) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (await (prisma as any).playerMatchStat.groupBy({
    by: ['lolAccountId'],
    where: { matchId: { in: matchIds }, ...where },
    [`_${agg}`]: { [field]: true },
    _count: { id: true },
  })) as PrismaGroupRow[];
  return rows
    .filter((r) => r._count.id >= 3)
    .map((r) => ({
      lolAccountId: r.lolAccountId,
      value: (r[`_${agg}`] as Record<string, number>)?.[field] ?? 0,
    }));
}

/** 1위 값과 동일한 모든 계정 반환 (동점 처리)
 *  - desc: 1위 값이 0이면 의미 없는 데이터로 간주 → 아무도 받지 않음
 */
function topAllBy(rows: GroupRow[], order: 'desc' | 'asc'): TitleHolder[] {
  if (rows.length === 0) return [];
  const sorted = [...rows].sort((a, b) =>
    order === 'desc' ? b.value - a.value : a.value - b.value,
  );
  const best = sorted[0].value;
  if (order === 'desc' && best === 0) return [];
  return sorted
    .filter((r) => r.value === best)
    .map((r) => ({ lolAccountId: r.lolAccountId, value: r.value }));
}

/** 포지션 필터 포함 avg/sum (최소 3게임) */
async function aggregateByPosition(
  matchIds: bigint[],
  position: string,
  field: string,
  agg: 'avg' | 'sum',
  minGames = 3,
): Promise<GroupRow[]> {
  if (matchIds.length === 0) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (await (prisma as any).playerMatchStat.groupBy({
    by: ['lolAccountId'],
    where: { matchId: { in: matchIds }, position },
    [`_${agg}`]: { [field]: true },
    _count: { id: true },
  })) as PrismaGroupRow[];
  return rows
    .filter((r) => r._count.id >= minGames)
    .map((r) => ({
      lolAccountId: r.lolAccountId,
      value: (r[`_${agg}`] as Record<string, number>)?.[field] ?? 0,
    }));
}

type StatWithDuration = {
  lolAccountId: bigint;
  damageDealt: number;
  damageTaken: number;
  cs: number;
  goldEarned: number;
  visionScore: number;
  wardsPlaced: number;
  wardsKilled: number;
  controlWardsPlaced: number;
  timeCCingOthers: number;
  enemyJungleMinions: number;
  shieldOnTeammates: number;
  healsOnTeammates: number;
  matchRecord: { gameDurationSecs: number };
};

const PER_MIN_FIELDS = {
  damageDealt: true,
  damageTaken: true,
  cs: true,
  goldEarned: true,
  visionScore: true,
  wardsPlaced: true,
  wardsKilled: true,
  controlWardsPlaced: true,
  timeCCingOthers: true,
  enemyJungleMinions: true,
  shieldOnTeammates: true,
  healsOnTeammates: true,
} as const;

type PerMinField = keyof typeof PER_MIN_FIELDS;

function buildPerMinMap(
  stats: StatWithDuration[],
  field: PerMinField,
  minGames: number,
): GroupRow[] {
  const map = new Map<bigint, { total: number; secs: number; games: number }>();
  for (const s of stats) {
    const cur = map.get(s.lolAccountId) ?? { total: 0, secs: 0, games: 0 };
    cur.total += s[field];
    cur.secs += s.matchRecord.gameDurationSecs;
    cur.games++;
    map.set(s.lolAccountId, cur);
  }
  return [...map.entries()]
    .filter(([, v]) => v.games >= minGames)
    .map(([id, v]) => ({ lolAccountId: id, value: v.secs > 0 ? v.total / (v.secs / 60) : 0 }));
}

/** 분당 계산: field 합계 / 총 게임시간(분) — 계정별 */
async function aggregatePerMin(
  matchIds: bigint[],
  field: PerMinField,
  where: Record<string, unknown> = {},
): Promise<GroupRow[]> {
  if (matchIds.length === 0) return [];
  const stats = await prisma.playerMatchStat.findMany({
    where: { matchId: { in: matchIds }, ...where },
    select: {
      lolAccountId: true,
      ...PER_MIN_FIELDS,
      matchRecord: { select: { gameDurationSecs: true } },
    },
  });
  return buildPerMinMap(stats, field, 3);
}

/** 포지션 필터 포함 분당 계산 */
async function aggregatePerMinByPosition(
  matchIds: bigint[],
  position: string,
  field: PerMinField,
  minGames = 3,
): Promise<GroupRow[]> {
  if (matchIds.length === 0) return [];
  const stats = await prisma.playerMatchStat.findMany({
    where: { matchId: { in: matchIds }, position },
    select: {
      lolAccountId: true,
      ...PER_MIN_FIELDS,
      matchRecord: { select: { gameDurationSecs: true } },
    },
  });
  return buildPerMinMap(stats, field, minGames);
}

/** 포지션별 승률 */
async function winRateByPosition(matchIds: bigint[], position: string): Promise<GroupRow[]> {
  if (matchIds.length === 0) return [];
  const stats = await prisma.playerMatchStat.findMany({
    where: { matchId: { in: matchIds }, position },
    select: { lolAccountId: true, isWin: true },
  });
  const map = new Map<bigint, { wins: number; total: number }>();
  for (const s of stats) {
    const cur = map.get(s.lolAccountId) ?? { wins: 0, total: 0 };
    cur.total++;
    if (s.isWin) cur.wins++;
    map.set(s.lolAccountId, cur);
  }
  return [...map.entries()]
    .filter(([, v]) => v.total >= 3)
    .map(([id, v]) => ({ lolAccountId: id, value: v.wins / v.total }));
}

/** 연승/연패 최장 기록 — 전체 계정 정렬 반환 */
async function allStreakRows(matchIds: bigint[], targetWin: boolean): Promise<GroupRow[]> {
  if (matchIds.length === 0) return [];
  const stats = await prisma.playerMatchStat.findMany({
    where: { matchId: { in: matchIds } },
    select: { lolAccountId: true, isWin: true, matchRecord: { select: { playedAt: true } } },
    orderBy: [{ lolAccountId: 'asc' }, { matchRecord: { playedAt: 'asc' } }],
  });

  const streakMap = new Map<bigint, number>();
  let cur: bigint | null = null;
  let streak = 0;

  for (const s of stats) {
    if (s.lolAccountId !== cur) {
      cur = s.lolAccountId;
      streak = 0;
    }
    if (s.isWin === targetWin) {
      streak++;
      const prev = streakMap.get(s.lolAccountId) ?? 0;
      if (streak > prev) streakMap.set(s.lolAccountId, streak);
    } else {
      streak = 0;
    }
  }

  return [...streakMap.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([id, v]) => ({ lolAccountId: id, value: v }));
}

/** 신인왕 수치 — 전체 계정 정렬 반환 */
async function allRookieRows(matchIds: bigint[]): Promise<GroupRow[]> {
  if (matchIds.length === 0) return [];
  const stats = await prisma.playerMatchStat.findMany({
    where: { matchId: { in: matchIds } },
    select: { lolAccountId: true, isWin: true, matchRecord: { select: { playedAt: true } } },
    orderBy: [{ lolAccountId: 'asc' }, { matchRecord: { playedAt: 'asc' } }],
  });

  const map = new Map<bigint, boolean[]>();
  for (const s of stats) {
    const arr = map.get(s.lolAccountId) ?? [];
    arr.push(s.isWin);
    map.set(s.lolAccountId, arr);
  }

  const rows: GroupRow[] = [];
  for (const [id, results] of map) {
    if (results.length < 5) continue;
    const first10 = results.slice(0, 10);
    rows.push({ lolAccountId: id, value: first10.filter(Boolean).length / first10.length });
  }
  return rows.sort((a, b) => b.value - a.value);
}

/** 연승/연패 최장 기록 — 동점자 전원 반환 */
async function maxStreakAccounts(matchIds: bigint[], targetWin: boolean): Promise<TitleHolder[]> {
  if (matchIds.length === 0) return [];
  const stats = await prisma.playerMatchStat.findMany({
    where: { matchId: { in: matchIds } },
    select: { lolAccountId: true, isWin: true, matchRecord: { select: { playedAt: true } } },
    orderBy: [{ lolAccountId: 'asc' }, { matchRecord: { playedAt: 'asc' } }],
  });

  const streakMap = new Map<bigint, number>();
  let cur: bigint | null = null;
  let streak = 0;

  for (const s of stats) {
    if (s.lolAccountId !== cur) {
      cur = s.lolAccountId;
      streak = 0;
    }
    if (s.isWin === targetWin) {
      streak++;
      const prev = streakMap.get(s.lolAccountId) ?? 0;
      if (streak > prev) streakMap.set(s.lolAccountId, streak);
    } else {
      streak = 0;
    }
  }

  if (streakMap.size === 0) return [];
  const best = Math.max(...streakMap.values());
  if (best < 3) return [];
  return [...streakMap.entries()]
    .filter(([, v]) => v === best)
    .map(([id, v]) => ({ lolAccountId: id, value: v }));
}

/** 조건부 카운트 (예: isWin && gameDuration >= X) */
async function countCondition(
  matchIds: bigint[],
  where: Record<string, unknown>,
): Promise<GroupRow[]> {
  if (matchIds.length === 0) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (await (prisma as any).playerMatchStat.groupBy({
    by: ['lolAccountId'],
    where: { matchId: { in: matchIds }, ...where },
    _count: { id: true },
  })) as PrismaGroupRow[];
  return rows.map((r) => ({
    lolAccountId: r.lolAccountId,
    value: r._count.id,
  }));
}

// ─── upsert helper ───────────────────────────────────────────────────────────

/** 칭호 보유자를 교체 (기존 삭제 후 새로 삽입, 수치 포함) */
async function setTitleHolders(
  guildServerId: bigint,
  titleCode: string,
  holders: TitleHolder[],
): Promise<void> {
  await prisma.userTitle.deleteMany({ where: { guildServerId, titleCode } });
  if (holders.length === 0) return;
  await prisma.userTitle.createMany({
    data: holders.map((h) => ({
      guildServerId,
      titleCode,
      lolAccountId: h.lolAccountId,
      statValue: h.value,
    })),
    skipDuplicates: true,
  });
}

// ─── 신인왕: 서버 첫 10게임 승률 1위 ────────────────────────────────────────

async function rookieKings(matchIds: bigint[]): Promise<TitleHolder[]> {
  if (matchIds.length === 0) return [];
  const stats = await prisma.playerMatchStat.findMany({
    where: { matchId: { in: matchIds } },
    select: { lolAccountId: true, isWin: true, matchRecord: { select: { playedAt: true } } },
    orderBy: [{ lolAccountId: 'asc' }, { matchRecord: { playedAt: 'asc' } }],
  });

  const map = new Map<bigint, boolean[]>();
  for (const s of stats) {
    const arr = map.get(s.lolAccountId) ?? [];
    arr.push(s.isWin);
    map.set(s.lolAccountId, arr);
  }

  const rows: GroupRow[] = [];
  for (const [id, results] of map) {
    if (results.length < 5) continue;
    const first10 = results.slice(0, 10);
    const wr = first10.filter(Boolean).length / first10.length;
    rows.push({ lolAccountId: id, value: wr });
  }
  return topAllBy(rows, 'desc');
}

// ─── 불사신: deaths=0 이면서 이긴 횟수 1위 ─────────────────────────────────

async function immortals(matchIds: bigint[]): Promise<TitleHolder[]> {
  const rows = await countCondition(matchIds, { isWin: true, deaths: 0 });
  return topAllBy(rows, 'desc');
}

// ─── main export ─────────────────────────────────────────────────────────────

export async function recalculateTitles(guildServerId: bigint): Promise<void> {
  const matchIds = await getServerMatchIds(guildServerId);
  if (matchIds.length === 0) return;

  const all = (field: string, agg: 'avg' | 'sum') => aggregateByAccount(matchIds, field, agg);
  const pos = (position: string, field: string, agg: 'avg' | 'sum', min?: number) =>
    aggregateByPosition(matchIds, position, field, agg, min);
  const posWr = (position: string) => winRateByPosition(matchIds, position);

  // 게임 수 기반 duration 필터용 (서버 유저 매치 중 조건 필터)
  const longIds = (
    await prisma.matchRecord.findMany({
      where: { id: { in: matchIds }, gameDurationSecs: { gte: 40 * 60 } },
      select: { id: true },
    })
  ).map((r) => r.id);
  const shortIds = (
    await prisma.matchRecord.findMany({
      where: { id: { in: matchIds }, gameDurationSecs: { lte: 25 * 60 } },
      select: { id: true },
    })
  ).map((r) => r.id);

  type TR = [string, TitleHolder[]];

  const safe = (code: string, p: Promise<TR>): Promise<TR> =>
    p.catch((e) => {
      console.error(`[title] ${code} 계산 실패:`, e);
      return [code, []] as TR;
    });

  const t = (code: string, rows: Promise<GroupRow[]>, order: 'desc' | 'asc'): Promise<TR> =>
    rows.then((r) => [code, topAllBy(r, order)]);

  const tp = (
    code: string,
    position: string,
    field: string,
    agg: 'avg' | 'sum',
    order: 'desc' | 'asc' = 'desc',
  ): Promise<TR> => pos(position, field, agg).then((r) => [code, topAllBy(r, order)]);

  const pm = (code: string, field: PerMinField): Promise<TR> =>
    aggregatePerMin(matchIds, field).then((r) => [code, topAllBy(r, 'desc')]);

  const pmp = (code: string, position: string, field: PerMinField): Promise<TR> =>
    aggregatePerMinByPosition(matchIds, position, field).then((r) => [code, topAllBy(r, 'desc')]);

  const titleResults: TR[] = await Promise.all([
    // 전투
    safe('학살자', t('학살자', all('kills', 'avg'), 'desc')),
    safe('생존왕', t('생존왕', all('deaths', 'avg'), 'asc')),
    safe('킹메이커', t('킹메이커', all('assists', 'avg'), 'desc')),
    safe('퍼블전문가', t('퍼블전문가', countCondition(matchIds, { firstBloodKill: true }), 'desc')),
    safe('펜타킬러', t('펜타킬러', all('pentaKills', 'sum'), 'desc')),
    safe('쿼드라킬러', t('쿼드라킬러', all('quadraKills', 'sum'), 'desc')),
    // 딜/탱
    safe('DPM머신', pm('DPM머신', 'damageDealt')),
    safe('샌드백', pm('샌드백', 'damageTaken')),
    safe('철거왕', t('철거왕', all('turretKills', 'avg'), 'desc')),
    // 오브젝트
    safe('용사냥꾼', t('용사냥꾼', all('dragonKills', 'sum'), 'desc')),
    safe('바론사냥꾼', t('바론사냥꾼', all('baronKills', 'sum'), 'desc')),
    // CS/골드
    safe('CS왕', pm('CS왕', 'cs')),
    safe('골드킹', pm('골드킹', 'goldEarned')),
    // 시야
    safe('만물의눈', pm('만물의눈', 'visionScore')),
    safe('와드장인', pm('와드장인', 'wardsPlaced')),
    safe('청소부', pm('청소부', 'wardsKilled')),
    safe('타임스토프', pm('타임스토프', 'timeCCingOthers')),
    // 기타
    safe('투명인간', t('투명인간', all('killParticipation', 'avg'), 'asc')),
    safe('솔로킹', t('솔로킹', all('soloKills', 'sum'), 'desc')),
    safe('흑백모니터', t('흑백모니터', all('deaths', 'avg'), 'desc')),
    Promise.resolve(['개근상', []] as TR),
    safe(
      '연승왕',
      maxStreakAccounts(matchIds, true).then((r) => ['연승왕', r]),
    ),
    safe(
      '연패왕',
      maxStreakAccounts(matchIds, false).then((r) => ['연패왕', r]),
    ),
    safe(
      '불사신',
      immortals(matchIds).then((r) => ['불사신', r]),
    ),
    safe(
      '신인왕',
      rookieKings(matchIds).then((r) => ['신인왕', r]),
    ),
    safe(
      '끈기왕',
      t(
        '끈기왕',
        longIds.length > 0 ? countCondition(longIds, { isWin: true }) : Promise.resolve([]),
        'desc',
      ),
    ),
    safe(
      '속전속결',
      t(
        '속전속결',
        shortIds.length > 0 ? countCondition(shortIds, { isWin: true }) : Promise.resolve([]),
        'desc',
      ),
    ),
    // 탑
    safe(
      'TOPKING',
      posWr('TOP').then((r) => ['TOPKING', topAllBy(r, 'desc')]),
    ),
    safe('전사왕', tp('전사왕', 'TOP', 'killParticipation', 'avg')),
    safe('고기방패', pmp('고기방패', 'TOP', 'damageTaken')),
    safe('고속도로건설자', tp('고속도로건설자', 'TOP', 'turretKills', 'avg')),
    safe('라인전의악마', tp('라인전의악마', 'TOP', 'soloKills', 'sum')),
    // 정글
    safe(
      'JUGKING',
      posWr('JUNGLE').then((r) => ['JUGKING', topAllBy(r, 'desc')]),
    ),
    safe('포식자', tp('포식자', 'JUNGLE', 'killParticipation', 'avg')),
    safe('작전명왕호야', tp('작전명왕호야', 'JUNGLE', 'objectivesStolen', 'sum')),
    safe('대도둑', pmp('대도둑', 'JUNGLE', 'enemyJungleMinions')),
    safe(
      '오브젝트마스터',
      (async () => {
        const dragonRows = await pos('JUNGLE', 'dragonKills', 'sum');
        const baronRows = await pos('JUNGLE', 'baronKills', 'sum');
        const combined = new Map<bigint, number>();
        for (const r of dragonRows)
          combined.set(r.lolAccountId, (combined.get(r.lolAccountId) ?? 0) + r.value);
        for (const r of baronRows)
          combined.set(r.lolAccountId, (combined.get(r.lolAccountId) ?? 0) + r.value);
        const rows = [...combined.entries()].map(([id, v]) => ({ lolAccountId: id, value: v }));
        return ['오브젝트마스터', topAllBy(rows, 'desc')] as TR;
      })(),
    ),
    // 미드
    safe(
      'MIDKING',
      posWr('MIDDLE').then((r) => ['MIDKING', topAllBy(r, 'desc')]),
    ),
    safe('황족', tp('황족', 'MIDDLE', 'killParticipation', 'avg')),
    safe('미드DPM', pmp('미드DPM', 'MIDDLE', 'damageDealt')),
    safe('로밍킹', tp('로밍킹', 'MIDDLE', 'assists', 'avg')),
    safe('미드솔로킬러', tp('미드솔로킬러', 'MIDDLE', 'soloKills', 'sum')),
    // 원딜
    safe(
      'ADKING',
      posWr('BOTTOM').then((r) => ['ADKING', topAllBy(r, 'desc')]),
    ),
    safe('해결사', tp('해결사', 'BOTTOM', 'killParticipation', 'avg')),
    safe('금수저', pmp('금수저', 'BOTTOM', 'cs')),
    safe('평타싸개', pmp('평타싸개', 'BOTTOM', 'damageDealt')),
    safe('존윅', tp('존윅', 'BOTTOM', 'deaths', 'avg', 'asc')),
    // 서폿
    safe(
      'SUPKING',
      posWr('UTILITY').then((r) => ['SUPKING', topAllBy(r, 'desc')]),
    ),
    safe('그림자', tp('그림자', 'UTILITY', 'killParticipation', 'avg')),
    safe('와드싸개', pmp('와드싸개', 'UTILITY', 'visionScore')),
    safe('경호원', pmp('경호원', 'UTILITY', 'shieldOnTeammates')),
    safe('베이비시터', pmp('베이비시터', 'UTILITY', 'healsOnTeammates')),
    // 핑와/비율
    safe('핑와장인', pm('핑와장인', 'controlWardsPlaced')),
    safe('딜폭군', t('딜폭군', all('dmgShare', 'avg'), 'desc')),
    safe('금고', t('금고', all('goldShare', 'avg'), 'desc')),
    safe('골드효율', t('골드효율', all('dmgPerGold', 'avg'), 'desc')),
  ]);

  // 개근상: 게임 수가 가장 많은 계정 (동점 포함)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gameCounts = (await (prisma as any).playerMatchStat.groupBy({
    by: ['lolAccountId'],
    where: { matchId: { in: matchIds } },
    _count: { id: true },
  })) as PrismaGroupRow[];
  const gameCountRows: GroupRow[] = gameCounts.map((r) => ({
    lolAccountId: r.lolAccountId,
    value: r._count.id,
  }));
  const mostGamesIds = topAllBy(gameCountRows, 'desc');

  // DB 저장
  for (const [code, accountIds] of titleResults) {
    if (code === '개근상') continue;
    await setTitleHolders(guildServerId, code, accountIds);
  }
  await setTitleHolders(guildServerId, '개근상', mostGamesIds);
}

export interface TitleRankRow {
  lolAccountId: bigint;
  value: number;
}

/**
 * 특정 칭호의 서버 내 전체 순위 반환
 * recalculateTitles와 동일한 계산 로직을 사용하되, 1위 자르지 않고 전체 정렬
 */
export async function getTitleRanking(
  guildServerId: bigint,
  titleCode: string,
): Promise<TitleRankRow[]> {
  const matchIds = await getServerMatchIds(guildServerId);
  if (matchIds.length === 0) return [];

  const all = (field: string, agg: 'avg' | 'sum', where: Record<string, unknown> = {}) =>
    aggregateByAccount(matchIds, field, agg, where);
  const pos = (position: string, field: string, agg: 'avg' | 'sum') =>
    aggregateByPosition(matchIds, position, field, agg);
  const pm = (field: PerMinField) => aggregatePerMin(matchIds, field);
  const pmp = (position: string, field: PerMinField) =>
    aggregatePerMinByPosition(matchIds, position, field);

  async function sorted(rows: Promise<GroupRow[]>, order: 'desc' | 'asc'): Promise<TitleRankRow[]> {
    const r = await rows;
    return [...r].sort((a, b) => (order === 'desc' ? b.value - a.value : a.value - b.value));
  }

  const longIds = (
    await prisma.matchRecord.findMany({
      where: { id: { in: matchIds }, gameDurationSecs: { gte: 40 * 60 } },
      select: { id: true },
    })
  ).map((r) => r.id);

  const shortIds = (
    await prisma.matchRecord.findMany({
      where: { id: { in: matchIds }, gameDurationSecs: { lte: 25 * 60 } },
      select: { id: true },
    })
  ).map((r) => r.id);

  switch (titleCode) {
    // 전투
    case '학살자':
      return sorted(all('kills', 'avg'), 'desc');
    case '생존왕':
      return sorted(all('deaths', 'avg'), 'asc');
    case '킹메이커':
      return sorted(all('assists', 'avg'), 'desc');
    case '퍼블전문가':
      return sorted(countCondition(matchIds, { firstBloodKill: true }), 'desc');
    case '펜타킬러':
      return sorted(all('pentaKills', 'sum'), 'desc');
    case '쿼드라킬러':
      return sorted(all('quadraKills', 'sum'), 'desc');
    // 딜/탱
    case 'DPM머신':
      return sorted(pm('damageDealt'), 'desc');
    case '샌드백':
      return sorted(pm('damageTaken'), 'desc');
    case '철거왕':
      return sorted(all('turretKills', 'avg'), 'desc');
    // 오브젝트
    case '용사냥꾼':
      return sorted(all('dragonKills', 'sum'), 'desc');
    case '바론사냥꾼':
      return sorted(all('baronKills', 'sum'), 'desc');
    // CS/골드
    case 'CS왕':
      return sorted(pm('cs'), 'desc');
    case '골드킹':
      return sorted(pm('goldEarned'), 'desc');
    // 시야
    case '만물의눈':
      return sorted(pm('visionScore'), 'desc');
    case '와드장인':
      return sorted(pm('wardsPlaced'), 'desc');
    case '청소부':
      return sorted(pm('wardsKilled'), 'desc');
    case '타임스토프':
      return sorted(pm('timeCCingOthers'), 'desc');
    // 기타
    case '투명인간':
      return sorted(all('killParticipation', 'avg'), 'asc');
    case '솔로킹':
      return sorted(all('soloKills', 'sum'), 'desc');
    case '흑백모니터':
      return sorted(all('deaths', 'avg'), 'desc');
    case '불사신':
      return sorted(countCondition(matchIds, { isWin: true, deaths: 0 }), 'desc');
    case '개근상': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = (await (prisma as any).playerMatchStat.groupBy({
        by: ['lolAccountId'],
        where: { matchId: { in: matchIds } },
        _count: { id: true },
      })) as PrismaGroupRow[];
      return rows
        .map((r) => ({ lolAccountId: r.lolAccountId, value: r._count.id }))
        .sort((a, b) => b.value - a.value);
    }
    case '연승왕':
      return allStreakRows(matchIds, true);
    case '연패왕':
      return allStreakRows(matchIds, false);
    case '신인왕':
      return allRookieRows(matchIds);
    case '끈기왕':
      return sorted(
        longIds.length > 0 ? countCondition(longIds, { isWin: true }) : Promise.resolve([]),
        'desc',
      );
    case '속전속결':
      return sorted(
        shortIds.length > 0 ? countCondition(shortIds, { isWin: true }) : Promise.resolve([]),
        'desc',
      );
    // 탑
    case 'TOPKING':
      return sorted(winRateByPosition(matchIds, 'TOP'), 'desc');
    case '전사왕':
      return sorted(pos('TOP', 'killParticipation', 'avg'), 'desc');
    case '고기방패':
      return sorted(pmp('TOP', 'damageTaken'), 'desc');
    case '고속도로건설자':
      return sorted(pos('TOP', 'turretKills', 'avg'), 'desc');
    case '라인전의악마':
      return sorted(pos('TOP', 'soloKills', 'sum'), 'desc');
    // 정글
    case 'JUGKING':
      return sorted(winRateByPosition(matchIds, 'JUNGLE'), 'desc');
    case '포식자':
      return sorted(pos('JUNGLE', 'killParticipation', 'avg'), 'desc');
    case '오브젝트마스터': {
      const dragonRows = await pos('JUNGLE', 'dragonKills', 'sum');
      const baronRows = await pos('JUNGLE', 'baronKills', 'sum');
      const combined = new Map<bigint, number>();
      for (const r of dragonRows)
        combined.set(r.lolAccountId, (combined.get(r.lolAccountId) ?? 0) + r.value);
      for (const r of baronRows)
        combined.set(r.lolAccountId, (combined.get(r.lolAccountId) ?? 0) + r.value);
      return [...combined.entries()]
        .map(([id, v]) => ({ lolAccountId: id, value: v }))
        .sort((a, b) => b.value - a.value);
    }
    case '작전명왕호야':
      return sorted(pos('JUNGLE', 'objectivesStolen', 'sum'), 'desc');
    case '대도둑':
      return sorted(pmp('JUNGLE', 'enemyJungleMinions'), 'desc');
    // 미드
    case 'MIDKING':
      return sorted(winRateByPosition(matchIds, 'MIDDLE'), 'desc');
    case '황족':
      return sorted(pos('MIDDLE', 'killParticipation', 'avg'), 'desc');
    case '미드DPM':
      return sorted(pmp('MIDDLE', 'damageDealt'), 'desc');
    case '로밍킹':
      return sorted(pos('MIDDLE', 'assists', 'avg'), 'desc');
    case '미드솔로킬러':
      return sorted(pos('MIDDLE', 'soloKills', 'sum'), 'desc');
    // 원딜
    case 'ADKING':
      return sorted(winRateByPosition(matchIds, 'BOTTOM'), 'desc');
    case '해결사':
      return sorted(pos('BOTTOM', 'killParticipation', 'avg'), 'desc');
    case '금수저':
      return sorted(pmp('BOTTOM', 'cs'), 'desc');
    case '평타싸개':
      return sorted(pmp('BOTTOM', 'damageDealt'), 'desc');
    case '존윅':
      return sorted(pos('BOTTOM', 'deaths', 'avg'), 'asc');
    // 서폿
    case 'SUPKING':
      return sorted(winRateByPosition(matchIds, 'UTILITY'), 'desc');
    case '그림자':
      return sorted(pos('UTILITY', 'killParticipation', 'avg'), 'desc');
    case '와드싸개':
      return sorted(pmp('UTILITY', 'visionScore'), 'desc');
    case '경호원':
      return sorted(pmp('UTILITY', 'shieldOnTeammates'), 'desc');
    case '베이비시터':
      return sorted(pmp('UTILITY', 'healsOnTeammates'), 'desc');
    case '핑와장인':
      return sorted(pm('controlWardsPlaced'), 'desc');
    case '딜폭군':
      return sorted(all('dmgShare', 'avg'), 'desc');
    case '금고':
      return sorted(all('goldShare', 'avg'), 'desc');
    case '골드효율':
      return sorted(all('dmgPerGold', 'avg'), 'desc');
    default:
      return [];
  }
}

/** 서버에서 특정 lolAccount가 보유한 칭호 목록 조회 */
export async function getTitlesForAccount(
  lolAccountId: bigint,
  guildServerId: bigint,
): Promise<TitleInfo[]> {
  const titles = await prisma.userTitle.findMany({
    where: { lolAccountId, guildServerId },
  });
  return titles.map((t) => TITLE_DEFINITIONS[t.titleCode]).filter(Boolean);
}

/** Discord 유저(여러 계정)의 서버 칭호 목록 */
export async function getTitlesForDiscordUser(
  discordUserId: bigint,
  guildServerId: bigint,
): Promise<{ info: TitleInfo; statValue: number | null }[]> {
  const user = await prisma.user.findUnique({
    where: { discordUserId },
    include: { lolAccounts: true },
  });
  if (!user) return [];
  const accountIds = user.lolAccounts.map((a) => a.id);
  const titles = await prisma.userTitle.findMany({
    where: { lolAccountId: { in: accountIds }, guildServerId },
  });
  const seen = new Map<string, { info: TitleInfo; statValue: number | null }>();
  for (const t of titles) {
    if (!seen.has(t.titleCode) && TITLE_DEFINITIONS[t.titleCode]) {
      seen.set(t.titleCode, {
        info: TITLE_DEFINITIONS[t.titleCode],
        statValue: t.statValue,
      });
    }
  }
  return [...seen.values()];
}
