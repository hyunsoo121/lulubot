import prisma from '../lib/prisma';
import { Prisma } from '../generated/prisma';
import { getAccountByRiotId } from './riot';

const MAX_ACCOUNTS_PER_USER = 5;

function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

async function linkUserToGuild(userId: bigint, guildServerId: bigint) {
  await prisma.guildServer.upsert({
    where: { id: guildServerId },
    update: {},
    create: { id: guildServerId },
  });
  await prisma.userGuildServer.upsert({
    where: { userId_guildServerId: { userId, guildServerId } },
    update: {},
    create: { userId, guildServerId },
  });
}

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
      if (guildServerId) await linkUserToGuild(existing.user.id, guildServerId);
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

  // LolAccount를 원자적으로 확보한다.
  // 위 existing 체크는 이 시점 이전의 상태일 뿐이라, 그 사이 다른 유저가 같은 puuid를
  // 먼저 등록해버리는 레이스가 가능하다 — 그래서 최종 쓰기는 DB의 유니크 제약과
  // 조건부 update(where에 userId: null 포함)에 맡겨 원자적으로 승자를 하나로 가른다.
  let lolAccount;
  try {
    lolAccount = await prisma.lolAccount.create({
      data: {
        userId: user.id,
        puuid: riotAccount.puuid,
        gameName: riotAccount.gameName,
        tagLine: riotAccount.tagLine,
      },
    });
  } catch (err) {
    if (!isUniqueConstraintError(err)) throw err;

    // 이미 존재하는 puuid(레이스에서 졌거나, 원래 있던/해제된 계정) — 주인이 없을 때만
    // (userId: null) claim. where에 조건이 같이 걸려 있어 두 요청이 동시에 와도
    // DB가 그중 하나에만 count: 1을 준다.
    const claimed = await prisma.lolAccount.updateMany({
      where: { puuid: riotAccount.puuid, userId: null },
      data: {
        userId: user.id,
        gameName: riotAccount.gameName,
        tagLine: riotAccount.tagLine,
      },
    });

    const current = await prisma.lolAccount.findUniqueOrThrow({
      where: { puuid: riotAccount.puuid },
      include: { user: true },
    });

    if (claimed.count === 0 && current.user?.discordUserId !== discordUserId) {
      throw new Error('이미 다른 유저가 등록한 계정입니다.');
    }
    lolAccount = current;
  }

  // 서버-유저 연결 (guildServerId가 있을 때)
  if (guildServerId) await linkUserToGuild(user.id, guildServerId);

  return lolAccount;
}

export async function getAccountByDiscordId(discordUserId: bigint) {
  const user = await prisma.user.findUnique({
    where: { discordUserId },
    include: { lolAccounts: true },
  });
  return user?.lolAccounts ?? [];
}
