import axios, { AxiosError } from 'axios';
import { RiotAccount, RiotMatch } from '../types';

const RIOT_API_KEY = process.env.RIOT_API_KEY ?? '';

const riotApi = axios.create({
  headers: { 'X-Riot-Token': RIOT_API_KEY },
});

/** Riot API 레이트 리밋 대응용 딜레이 */
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 여러 유저의 스캔이 동시에 돌아도 Riot API 호출 자체는 전역으로 한 줄로 세워 페이싱한다.
 * 유저별 스캔 락(matchScan.ts의 scan:lock:*)은 "같은 유저 중복 스캔"만 막을 뿐이고,
 * API 키의 레이트리밋은 키 하나에 전역으로 걸리므로 별도의 전역 페이싱이 필요하다.
 * (이전엔 호출부마다 각자 sleep(1200)을 걸었는데, 동시에 도는 스캔 수만큼 실제
 * 호출 빈도가 배로 뛰는 문제가 있었다.)
 */
const MIN_CALL_INTERVAL_MS = 1200;
let throttleQueue: Promise<void> = Promise.resolve();
let lastCallAt = 0;

function throttle(): Promise<void> {
  const next = throttleQueue.then(async () => {
    const wait = Math.max(0, lastCallAt + MIN_CALL_INTERVAL_MS - Date.now());
    if (wait > 0) await sleep(wait);
    lastCallAt = Date.now();
  });
  // 한 호출의 대기가 실패해도(사실상 없지만) 큐 자체가 끊기지 않도록
  throttleQueue = next.catch(() => {});
  return next;
}

/** 429 시 Retry-After만큼 기다렸다가 재시도하는 래퍼 */
async function riotGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    await throttle();
    try {
      const { data } = await riotApi.get(url, { params });
      return data as T;
    } catch (err) {
      const axiosErr = err as AxiosError;
      const status = axiosErr.response?.status;
      if (status === 429) {
        const retryAfter = Number(axiosErr.response!.headers['retry-after'] ?? 10);
        const waitMs = (retryAfter + 1) * 1000;
        console.warn(`[Riot] 429 rate limit — ${retryAfter}초 대기 (시도 ${attempt + 1}/5)`);
        await sleep(waitMs);
      } else {
        const body = axiosErr.response?.data ? JSON.stringify(axiosErr.response.data) : '(no body)';
        console.error(`[Riot] HTTP ${status} — ${url} — ${body}`);
        throw new Error(`Riot API 오류 (${status}): ${url}`);
      }
    }
  }
  throw new Error('[Riot] 최대 재시도 횟수 초과 (429)');
}

export async function getAccountByRiotId(gameName: string, tagLine: string): Promise<RiotAccount> {
  const data = await riotGet<{ puuid: string; gameName: string; tagLine: string }>(
    `https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
  );
  return { puuid: data.puuid, gameName: data.gameName, tagLine: data.tagLine };
}

/**
 * 페이지네이션으로 매치 ID를 가져옴
 * @param startTime 이 시각(epoch 초) 이후 매치만 조회. 없으면 전체
 */
export async function getAllMatchIds(puuid: string, startTime?: number): Promise<string[]> {
  const all: string[] = [];
  let start = 0;
  const count = 100;

  while (true) {
    const params: Record<string, unknown> = { queue: 3130, start, count };
    if (startTime !== undefined) params.startTime = startTime;

    const data = await riotGet<string[]>(
      `https://asia.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids`,
      params,
    );
    all.push(...data);
    if (data.length < count) break;
    start += count;
    // 다음 페이지 호출도 riotGet 내부의 전역 throttle이 알아서 페이싱하므로 별도 sleep 불필요
  }

  return all;
}

export async function getMatch(matchId: string): Promise<RiotMatch> {
  return riotGet<RiotMatch>(`https://asia.api.riotgames.com/lol/match/v5/matches/${matchId}`);
}

export interface RiotLeagueEntry {
  queueType: 'RANKED_SOLO_5x5' | 'RANKED_FLEX_SR';
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
}

export async function getRankedInfo(puuid: string): Promise<RiotLeagueEntry[]> {
  try {
    return await riotGet<RiotLeagueEntry[]>(
      `https://kr.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`,
    );
  } catch (err) {
    console.warn(`[Riot] getRankedInfo 실패 puuid=${puuid}:`, err);
    return [];
  }
}
