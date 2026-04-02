import 'dotenv/config';
import { REST, Routes } from 'discord.js';

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId || !guildId) {
  console.error('[Clear] DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID 환경변수를 확인하세요.');
  process.exit(1);
}

const rest = new REST().setToken(token);

(async () => {
  console.log('[Clear] 길드 커맨드 초기화 중...');
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
  console.log('[Clear] 완료');
  process.exit(0);
})().catch((err) => {
  console.error('[Clear] 오류:', err);
  process.exit(1);
});
