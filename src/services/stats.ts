import prisma from '../lib/prisma';

export async function getGlobalStatByDiscordId(discordUserId: bigint) {
  const user = await prisma.user.findUnique({
    where: { discordUserId },
    include: {
      lolAccounts: {
        include: { userGlobalStat: true },
      },
    },
  });

  if (!user || user.lolAccounts.length === 0) return null;

  // 계정이 여러 개면 합산
  const account = user.lolAccounts[0];
  return { account, stat: account.userGlobalStat };
}

export async function getRecentMatchByDiscordId(discordUserId: bigint) {
  const user = await prisma.user.findUnique({
    where: { discordUserId },
    include: { lolAccounts: true },
  });

  if (!user || user.lolAccounts.length === 0) return null;

  const lolAccountIds = user.lolAccounts.map((a) => a.id);

  const stat = await prisma.playerMatchStat.findFirst({
    where: { lolAccountId: { in: lolAccountIds } },
    orderBy: { matchRecord: { playedAt: 'desc' } },
    include: {
      matchRecord: {
        include: {
          playerStats: {
            include: { lolAccount: true },
          },
        },
      },
      lolAccount: true,
    },
  });

  return stat;
}
