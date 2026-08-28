import { Client, Events } from 'discord.js';
import { clearAllScanLocks } from '../../services/matchScan';
import { deploySlashCommands } from '../deploySlashCommands';

export default function readyEvent(client: Client) {
  client.once(Events.ClientReady, async (c) => {
    console.log(`[Bot] ${c.user.tag} 로그인 완료`);
    await clearAllScanLocks();
    await deploySlashCommands().catch((err) =>
      console.error('[Bot] 슬래시 커맨드 자동 등록 실패:', err),
    );
  });
}
