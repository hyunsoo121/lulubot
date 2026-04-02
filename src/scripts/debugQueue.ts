import 'dotenv/config';
import axios from 'axios';

const RIOT_API_KEY = process.env.RIOT_API_KEY ?? '';
const PUUID = process.argv[2];

if (!PUUID) {
  console.error('사용법: ts-node src/scripts/debugQueue.ts <PUUID>');
  process.exit(1);
}

const riotApi = axios.create({ headers: { 'X-Riot-Token': RIOT_API_KEY } });

async function fetchIds(params: Record<string, unknown>): Promise<string[]> {
  const { data } = await riotApi.get(
    `https://asia.api.riotgames.com/lol/match/v5/matches/by-puuid/${PUUID}/ids`,
    { params },
  );
  return data;
}

async function main() {
  const SIX_MONTHS_AGO = Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 180;

  console.log('== queue=0 (커스텀) ==');
  const withQueue = await fetchIds({ queue: 0, start: 0, count: 20, startTime: SIX_MONTHS_AGO });
  console.log(`결과 수: ${withQueue.length}`);
  console.log(withQueue);

  console.log('\n== queue 없음 (전체) ==');
  const withoutQueue = await fetchIds({ start: 0, count: 20, startTime: SIX_MONTHS_AGO });
  console.log(`결과 수: ${withoutQueue.length}`);
  console.log(withoutQueue);

  // queue=0에 없는데 전체에는 있는 것들의 gameType 확인
  const onlyInAll = withoutQueue.filter((id) => !withQueue.includes(id));
  if (onlyInAll.length > 0) {
    console.log('\n== queue=0에서 빠진 매치들 gameType 확인 ==');
    for (const matchId of onlyInAll.slice(0, 5)) {
      const { data } = await riotApi.get(
        `https://asia.api.riotgames.com/lol/match/v5/matches/${matchId}`,
      );
      console.log(
        `${matchId} → gameType: ${data.info.gameType}, gameMode: ${data.info.gameMode}, queueId: ${data.info.queueId}`,
      );
    }
  }
}

main().catch(console.error);
