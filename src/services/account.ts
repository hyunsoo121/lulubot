import prisma from '../lib/prisma';
import { getAccountByRiotId } from './riot';

const MAX_ACCOUNTS_PER_USER = 5;

export async function registerAccount(
  discordUserId: bigint,
  gameName: string,
  tagLine: string,
  guildServerId?: bigint,
) {
  // Riot API로 PUUID 조회
  const riotAccount = await getAccountByRiotId(gameName, tagLine);

  // 이미 등록된 PUUID인지 확인
  const existing = await prisma.lolAccount.findUnique({
    where: { puuid: riotAccount.puuid },
    include: { user: true },
  });

  if (existing) {
    // 이미 다른 디스코드 유저가 등록한 경우
    if (existing.user?.discordUserId && existing.user.discordUserId !== discordUserId) {
      throw new Error('이미 다른 유저가 등록한 계정입니다.');
    }
    // 본인이 이미 등록한 경우 (userId=null로 해제된 경우 제외) → 서버 연결만 추가하고 반환
    if (existing.userId !== null && existing.user?.discordUserId === discordUserId) {
      if (guildServerId) {
        await prisma.guildServer.upsert({
          where: { id: guildServerId },
          update: {},
          create: { id: guildServerId },
        });
        await prisma.userGuildServer.upsert({
          where: { userId_guildServerId: { userId: existing.user.id, guildServerId } },
          update: {},
          create: { userId: existing.user.id, guildServerId },
        });
      }
      throw new Error('이미 등록된 계정입니다.');
    }
  }

  // User upsert (discord_user_id 기준)
  const user = await prisma.user.upsert({
    where: { discordUserId },
    update: {},
    create: { discordUserId },
  });

  // 여기까지 왔다는 건 이 유저에게 새로 계정을 연결하는 경우(신규 또는 예전에 해제했던 계정 재연결)
  // — 이미 갖고 있는 계정을 다른 서버에 추가 연결하는 경우는 위에서 먼저 걸러져서 여기 안 옴
  const accountCount = await prisma.lolAccount.count({ where: { userId: user.id } });
  if (accountCount >= MAX_ACCOUNTS_PER_USER) {
    throw new Error(
      `계정은 최대 ${MAX_ACCOUNTS_PER_USER}개까지 등록할 수 있습니다. \`/계정삭제\`로 기존 계정을 먼저 해제해주세요.`,
    );
  }

  // LolAccount upsert (puuid 기준)
  const lolAccount = await prisma.lolAccount.upsert({
    where: { puuid: riotAccount.puuid },
    update: {
      userId: user.id,
      gameName: riotAccount.gameName,
      tagLine: riotAccount.tagLine,
    },
    create: {
      userId: user.id,
      puuid: riotAccount.puuid,
      gameName: riotAccount.gameName,
      tagLine: riotAccount.tagLine,
    },
  });

  // 서버-유저 연결 (guildServerId가 있을 때)
  if (guildServerId) {
    await prisma.guildServer.upsert({
      where: { id: guildServerId },
      update: {},
      create: { id: guildServerId },
    });
    await prisma.userGuildServer.upsert({
      where: { userId_guildServerId: { userId: user.id, guildServerId } },
      update: {},
      create: { userId: user.id, guildServerId },
    });
  }

  return lolAccount;
}

export async function getAccountByDiscordId(discordUserId: bigint) {
  const user = await prisma.user.findUnique({
    where: { discordUserId },
    include: { lolAccounts: true },
  });
  return user?.lolAccounts ?? [];
}
