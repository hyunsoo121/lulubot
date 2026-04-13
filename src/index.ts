import 'dotenv/config';
import { createBotClient } from './bot';
import { createServer } from './server';

const PORT = process.env.PORT ?? 3000;

async function main() {
  // Express 서버 시작
  const app = createServer();
  app.listen(PORT, () => {
    console.log(`[Server] http://localhost:${PORT} 실행 중`);
  });

  // Discord 봇 시작
  const client = createBotClient();
  await client.login(process.env.DISCORD_TOKEN);
}

main().catch((err) => {
  console.error('[Fatal]', err);
  process.exit(1);
});
