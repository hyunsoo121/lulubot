import { Client, Events } from 'discord.js';

export default function readyEvent(client: Client) {
  client.once(Events.ClientReady, (c) => {
    console.log(`[Bot] ${c.user.tag} 로그인 완료`);
  });
}
