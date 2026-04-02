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

/** 429 시 Retry-After만큼 기다렸다가 재시도하는 래퍼 */
async function riotGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const { data } = await riotApi.get(url, { params });
      return data as T;
    } catch (err) {
      const axiosErr = err as AxiosError;
      if (axiosErr.response?.status === 429) {
        const retryAfter = Number(axiosErr.response.headers['retry-after'] ?? 10);
        const waitMs = (retryAfter + 1) * 1000;
        console.warn(`[Riot] 429 rate limit — ${retryAfter}초 대기 (시도 ${attempt + 1}/5)`);
        await sleep(waitMs);
      } else {
        throw err;
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
    await sleep(1200);
  }

  return all;
}

export async function getMatch(matchId: string): Promise<RiotMatch> {
  return riotGet<RiotMatch>(
    `https://asia.api.riotgames.com/lol/match/v5/matches/${matchId}`,
  );
}
