import { Client, Events } from 'discord.js';
import { clearAllScanLocks } from '../../services/matchScan';

export default function readyEvent(client: Client) {
  client.once(Events.ClientReady, async (c) => {
    console.log(`[Bot] ${c.user.tag} 로그인 완료`);
    await clearAllScanLocks();
  });
}
