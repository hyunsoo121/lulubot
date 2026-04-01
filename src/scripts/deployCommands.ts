import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { commands } from '../bot/commands';

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;

if (!token || !clientId) {
  console.error('[Deploy] DISCORD_TOKEN, DISCORD_CLIENT_ID 환경변수를 확인하세요.');
  process.exit(1);
}

const rest = new REST().setToken(token);

const body = [...commands.values()].map((cmd) => cmd.data.toJSON());

(async () => {
  console.log(`[Deploy] ${body.length}개 슬래시 커맨드 등록 중...`);

  await rest.put(Routes.applicationCommands(clientId), { body });

  console.log('[Deploy] 완료');
})().catch((err) => {
  console.error('[Deploy] 오류:', err);
  process.exit(1);
});
