import 'dotenv/config';
import prisma from '../lib/prisma';

async function main() {
  const users = await prisma.user.findMany({
    include: {
      lolAccounts: { include: { userGlobalStat: true } },
      userGuildServers: true,
    },
  });
  const guildServers = await prisma.guildServer.findMany();

  const replacer = (_: string, v: unknown) => (typeof v === 'bigint' ? v.toString() : v);
  console.log('=== GuildServers ===');
  console.log(JSON.stringify(guildServers, replacer, 2));
  console.log('=== Users ===');
  console.log(JSON.stringify(users, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2));
}

main().catch(console.error).finally(() => process.exit());
