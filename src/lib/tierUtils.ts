import { RiotLeagueEntry } from '../services/riot';

const TIER_ORDER = [
  'IRON',
  'BRONZE',
  'SILVER',
  'GOLD',
  'PLATINUM',
  'EMERALD',
  'DIAMOND',
  'MASTER',
  'GRANDMASTER',
  'CHALLENGER',
];
const RANK_ORDER = ['IV', 'III', 'II', 'I'];

const TIER_KR: Record<string, string> = {
  IRON: '아이언',
  BRONZE: '브론즈',
  SILVER: '실버',
  GOLD: '골드',
  PLATINUM: '플래티넘',
  EMERALD: '에메랄드',
  DIAMOND: '다이아몬드',
  MASTER: '마스터',
  GRANDMASTER: '그랜드마스터',
  CHALLENGER: '챌린저',
};

export function tierScore(entry: RiotLeagueEntry): number {
  const tierIdx = TIER_ORDER.indexOf(entry.tier);
  const rankIdx = RANK_ORDER.indexOf(entry.rank);
  return tierIdx * 400 + rankIdx * 100 + entry.leaguePoints;
}

export function formatTier(entry: RiotLeagueEntry): string {
  const tier = TIER_KR[entry.tier] ?? entry.tier;
  const isMaster = ['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(entry.tier);
  return isMaster
    ? `${tier} ${entry.leaguePoints}LP`
    : `${tier} ${entry.rank} ${entry.leaguePoints}LP`;
}

export function getHighestEntry(
  entries: RiotLeagueEntry[],
  queueType: 'RANKED_SOLO_5x5' | 'RANKED_FLEX_SR',
): RiotLeagueEntry | null {
  return (
    entries
      .filter((e) => e.queueType === queueType)
      .sort((a, b) => tierScore(b) - tierScore(a))[0] ?? null
  );
}
