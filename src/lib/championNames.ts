import axios from 'axios';

let championMap: Record<number, string> | null = null;

export async function getChampionName(championId: number): Promise<string> {
  if (!championMap) {
    // 최신 버전 조회
    const { data: versions } = await axios.get(
      'https://ddragon.leagueoflegends.com/api/versions.json',
    );
    const latest = versions[0];

    const { data } = await axios.get(
      `https://ddragon.leagueoflegends.com/cdn/${latest}/data/ko_KR/champion.json`,
    );

    championMap = {};
    for (const champ of Object.values(data.data) as { key: string; name: string }[]) {
      championMap[Number(champ.key)] = champ.name;
    }
  }

  return championMap[championId] ?? `챔피언(${championId})`;
}
