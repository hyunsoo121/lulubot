import 'dotenv/config';
import prisma from '../lib/prisma';
import { getMatch, sleep } from '../services/riot';

/**
 * /밴픽률 기능 도입 이전에 이미 저장된 매치들은 밴 데이터가 없다.
 * Riot 매치 API는 matchId만 있으면 시점과 무관하게 다시 조회할 수 있으므로,
 * 기존 MatchRecord를 순회하며 밴 데이터만 재조회해서 채워 넣는 1회성 백필 스크립트.
 */
async function main() {
  const matches = await prisma.matchRecord.findMany({
    select: { id: true, matchId: true },
    orderBy: { id: 'asc' },
  });
  console.log(`대상 매치 ${matches.length}건`);

  let filled = 0;
  let skipped = 0;
  let failed = 0;

  for (const m of matches) {
    const existing = await prisma.championBan.findFirst({ where: { matchId: m.id } });
    if (existing) {
      skipped++;
      continue;
    }

    try {
      const riot = await getMatch(m.matchId);
      const banInserts = riot.info.teams.flatMap((t) =>
        (t.bans ?? [])
          .filter((b) => b.championId > 0)
          .map((b) => ({
            matchId: m.id,
            team: (t.teamId === 100 ? 'BLUE' : 'RED') as 'BLUE' | 'RED',
            championId: b.championId,
            pickTurn: b.pickTurn,
          })),
      );

      if (banInserts.length > 0) {
        await prisma.championBan.createMany({ data: banInserts });
        filled++;
        console.log(`  ✓ ${m.matchId}: 밴 ${banInserts.length}개 저장`);
      } else {
        console.log(`  - ${m.matchId}: 밴 데이터 없음(전부 미사용 슬롯)`);
      }
    } catch (err) {
      failed++;
      console.error(`  ✗ ${m.matchId} 조회 실패:`, err instanceof Error ? err.message : err);
    }

    await sleep(1200);
  }

  console.log(`완료 — 채움 ${filled}건, 이미 있음 ${skipped}건, 실패 ${failed}건`);
}

main()
  .catch(console.error)
  .finally(() => process.exit());
