import axios from 'axios';
import { RiotAccount } from '../types';

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
