import {
  ActionRowBuilder,
  AuditLogEvent,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  EmbedBuilder,
  Events,
  Guild,
  PartialUser,
  PermissionFlagsBits,
  TextChannel,
  User,
} from 'discord.js';

/** 봇이 메시지를 보낼 수 있는 채널을 찾는다 (시스템 채널 우선, 없으면 첫 텍스트 채널) */
function findWelcomeChannel(guild: Guild): TextChannel | null {
  const me = guild.members.me;
  if (!me) return null;

  const canPost = (channel: TextChannel) =>
    channel
      .permissionsFor(me)
      ?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]) === true;

  if (guild.systemChannel && canPost(guild.systemChannel)) {
    return guild.systemChannel;
  }

  return (
    guild.channels.cache.find(
      (c): c is TextChannel => c.type === ChannelType.GuildText && canPost(c as TextChannel),
    ) ?? null
  );
}

/** 감사 로그의 "봇 추가" 항목에서 봇을 초대한 유저를 찾는다 (권한/기록 없으면 null) */
async function findInviter(guild: Guild): Promise<User | PartialUser | null> {
  const me = guild.members.me;
  if (!me?.permissions.has(PermissionFlagsBits.ViewAuditLog)) return null;

  try {
    const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.BotAdd, limit: 5 });
    const entry = logs.entries.find((e) => e.target?.id === guild.client.user?.id);
    return entry?.executor ?? null;
  } catch (err) {
    console.error('[Bot] 초대자 조회 실패:', err);
    return null;
  }
}

function buildWelcomeMessage() {
  const embed = new EmbedBuilder()
    .setTitle('🎉 룰루봇을 초대해주셔서 감사합니다!')
    .setColor(0x5865f2)
    .setDescription(
      [
        '• `/도움말` 로 모든 명령어를 확인할 수 있어요.',
        '• 시작하려면 `/계정등록 닉네임#태그` 로 본인의 라이엇 계정을 먼저 연결해주세요.',
        '• 등록 직후 자동으로 전적 갱신이 시작되고, 완료되면 `/유저전적`, `/랭킹` 등으로 바로 확인할 수 있어요.',
      ].join('\n'),
    );

  const supportUrl = process.env.SUPPORT_SERVER_URL;
  const components = supportUrl
    ? [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setLabel('📣 서포트 서버')
            .setStyle(ButtonStyle.Link)
            .setURL(supportUrl),
        ),
      ]
    : [];

  return { embeds: [embed], components };
}

export default function guildCreateEvent(client: Client) {
  client.on(Events.GuildCreate, async (guild) => {
    try {
      const message = buildWelcomeMessage();

      const inviter = await findInviter(guild);
      if (inviter) {
        try {
          await inviter.send(message);
          return;
        } catch (err) {
          console.error('[Bot] 초대자 DM 발송 실패, 채널로 대체:', err);
        }
      }

      // 초대자를 못 찾았거나 DM이 막혀있으면 채널에 게시
      const channel = findWelcomeChannel(guild);
      if (!channel) return;
      await channel.send(message);
    } catch (err) {
      console.error('[Bot] 서버 참가 환영 메시지 전송 실패:', err);
    }
  });
}
