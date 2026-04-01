import axios from 'axios';
import { RiotAccount, RiotMatch } from '../types';

const RIOT_API_KEY = process.env.RIOT_API_KEY ?? '';

const riotApi = axios.create({
  headers: { 'X-Riot-Token': RIOT_API_KEY },
});

export async function getAccountByRiotId(gameName: string, tagLine: string): Promise<RiotAccount> {
  const { data } = await riotApi.get(
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
    const params: Record<string, unknown> = { start, count };
    if (startTime !== undefined) params.startTime = startTime;

    const { data } = await riotApi.get(
      `https://asia.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids`,
      { params },
    );
    all.push(...data);
    if (data.length < count) break;
    start += count;
    await sleep(200);
  }

  return all;
}

export async function getMatch(matchId: string): Promise<RiotMatch> {
  const { data } = await riotApi.get(
    `https://asia.api.riotgames.com/lol/match/v5/matches/${matchId}`,
  );
  return data;
}

/** Riot API 레이트 리밋 대응용 딜레이 */
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
