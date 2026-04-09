/**
 * 모든 서버의 칭호를 강제 재계산합니다.
 * 실행: npx ts-node src/scripts/recalcTitles.ts
 */
import 'dotenv/config';
import prisma from '../lib/prisma';
import { recalculateTitles } from '../services/titleService';

async function main() {
  const servers = await prisma.guildServer.findMany({ select: { id: true, serverName: true } });
  console.log(`총 ${servers.length}개 서버 칭호 재계산 시작`);

  for (const server of servers) {
    console.log(`[${server.serverName ?? server.id}] 계산 중...`);
    try {
      await recalculateTitles(server.id);
      console.log(`[${server.serverName ?? server.id}] ✅ 완료`);
    } catch (e) {
      console.error(`[${server.serverName ?? server.id}] ❌ 실패:`, e);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
