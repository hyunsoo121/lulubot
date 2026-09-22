import { REST, Routes } from 'discord.js';
import { commands } from './commands';

/** 현재 등록된 커맨드 목록을 디스코드에 글로벌 커맨드로 동기화 */
export async function deploySlashCommands(): Promise<void> {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;

  if (!token || !clientId) {
    throw new Error('DISCORD_TOKEN, DISCORD_CLIENT_ID 환경변수를 확인하세요.');
  }

  const rest = new REST().setToken(token);
  const body = [...commands.values()].map((cmd) => cmd.data.toJSON());

  console.log(`[Deploy] ${body.length}개 슬래시 커맨드 등록 중...`);
  await rest.put(Routes.applicationCommands(clientId), { body });
  console.log('[Deploy] 완료');
}
