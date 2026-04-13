/**
 * API 키 교체 후 DB에 저장된 PUUID를 새 키로 재발급받아 업데이트합니다.
 * 실행: npx ts-node src/scripts/refreshPuuids.ts
 */
import 'dotenv/config';
import prisma from '../lib/prisma';
import { getAccountByRiotId, sleep } from '../services/riot';

async function main() {
  const accounts = await prisma.lolAccount.findMany();
  console.log(`총 ${accounts.length}개 계정 PUUID 갱신 시작`);

  let updated = 0;
  let failed = 0;

  for (const acc of accounts) {
    try {
      const fresh = await getAccountByRiotId(acc.gameName, acc.tagLine);
      if (fresh.puuid !== acc.puuid) {
        await prisma.lolAccount.update({
          where: { id: acc.id },
          data: { puuid: fresh.puuid },
        });
        console.log(`✅ ${acc.gameName}#${acc.tagLine} PUUID 갱신`);
        updated++;
      } else {
        console.log(`- ${acc.gameName}#${acc.tagLine} 변경 없음`);
      }
      await sleep(300);
    } catch (err) {
      console.error(`❌ ${acc.gameName}#${acc.tagLine} 실패:`, err);
      failed++;
    }
  }

  console.log(`\n완료: 갱신 ${updated}개 / 실패 ${failed}개`);
  await prisma.$disconnect();
}

main().catch(console.error);
