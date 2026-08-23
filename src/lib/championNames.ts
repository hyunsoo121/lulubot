import axios from 'axios';

let championMap: Record<number, string> | null = null;

async function loadChampionMap(): Promise<Record<number, string>> {
  if (championMap) return championMap;

  // 최신 버전 조회
  const { data: versions } = await axios.get(
    'https://ddragon.leagueoflegends.com/api/versions.json',
  );
  const latest = versions[0];

  const { data } = await axios.get(
    `https://ddragon.leagueoflegends.com/cdn/${latest}/data/ko_KR/champion.json`,
  );

  const map: Record<number, string> = {};
  for (const champ of Object.values(data.data) as { key: string; name: string }[]) {
    map[Number(champ.key)] = champ.name;
  }
  championMap = map;
  return map;
}

export async function getChampionName(championId: number): Promise<string> {
  const map = await loadChampionMap();
  return map[championId] ?? `챔피언(${championId})`;
}

/** 자동완성용 챔피언 전체 목록 (id, name) */
export async function getAllChampions(): Promise<{ id: number; name: string }[]> {
  const map = await loadChampionMap();
  return Object.entries(map).map(([id, name]) => ({ id: Number(id), name }));
}
