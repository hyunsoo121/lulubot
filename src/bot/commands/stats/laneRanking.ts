import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import prisma from '../../../lib/prisma';
import { getServerAccountIds, getServerMatchIds } from '../../../services/titleService';
import { filterMatchIds } from '../../../services/matchFilter';
import { readFilterOptions } from '../shared/filterOptions';

export const data = new SlashCommandBuilder()
  .setName('라인랭킹')
  .setDescription('라인별 특화 스탯 랭킹을 조회합니다. (기본: 서버 기반)')
  .addStringOption((option) =>
    option
      .setName('라인')
      .setDescription('조회할 라인')
      .setRequired(true)
      .addChoices(
        { name: '탑', value: 'TOP' },
        { name: '정글', value: 'JUNGLE' },
        { name: '미드', value: 'MIDDLE' },
        { name: '원딜', value: 'BOTTOM' },
        { name: '서폿', value: 'UTILITY' },
      ),
  )
  .addBooleanOption((option) =>
    option
      .setName('서버기반')
      .setDescription('서버 등록 계정끼리만 진행된 매치만 포함 (기본값 true, 참가자 8명 이상)')
      .setRequired(false),
  )
  .addStringOption((option) =>
    option.setName('시작일').setDescription('YYYY-MM-DD (이 날짜 이후 매치만)').setRequired(false),
  )
  .addStringOption((option) =>
    option.setName('종료일').setDescription('YYYY-MM-DD (이 날짜 이전 매치만)').setRequired(false),
  );

const MEDALS = ['🥇', '🥈', '🥉'];
const MIN_GAMES = 3;
const PAGE_SIZE = 10;

const POSITION_META = {
  TOP: { name: '탑', icon: '🏔️' },
  JUNGLE: { name: '정글', icon: '🌲' },
  MIDDLE: { name: '미드', icon: '🔮' },
  BOTTOM: { name: '원딜', icon: '🏹' },
  UTILITY: { name: '서폿', icon: '💊' },
} as const;

type Position = keyof typeof POSITION_META;

interface LaneStat {
  games: number;
  wins: number;
  kills: number;
  deaths: number;
  assists: number;
  totalDamage: number;
  totalDamageTaken: number;
  totalCs: number;
  totalGold: number;
  totalVision: number;
  totalWards: number;
  totalCcTime: number;
  totalKillParticipation: number;
  totalDragonBaron: number;
  totalEnemyJungle: number;
  totalSoloKills: number;
  totalGameDurationSecs: number;
}

function dpm(totalDamage: number, totalSecs: number): string {
  return Math.round(totalDamage / (totalSecs / 60)).toLocaleString('ko-KR');
}

function pad(s: string, len: number): string {
  if (s.length >= len) return s.slice(0, len);
  return s + ' '.repeat(len - s.length);
}

/** 포지션별 표 컬럼 정의: [헤더, 너비, 값추출함수] */
function columnsFor(
  position: Position,
): { header: string; width: number; value: (s: LaneStat) => string }[] {
  const base: { header: string; width: number; value: (s: LaneStat) => string }[] = [
    { header: '판수', width: 4, value: (s) => `${s.games}` },
    { header: '승률', width: 5, value: (s) => `${((s.wins / s.games) * 100).toFixed(0)}%` },
    {
      header: 'KDA',
      width: 5,
      value: (s) => ((s.kills + s.assists) / Math.max(s.deaths, 1)).toFixed(2),
    },
    {
      header: '킬관여',
      width: 5,
      value: (s) => `${((s.totalKillParticipation / s.games) * 100).toFixed(0)}%`,
    },
  ];

  switch (position) {
    case 'TOP':
      return [
        ...base,
        { header: 'DPM', width: 6, value: (s) => dpm(s.totalDamage, s.totalGameDurationSecs) },
        {
          header: '탱킹/분',
          width: 7,
          value: (s) => dpm(s.totalDamageTaken, s.totalGameDurationSecs),
        },
        { header: '솔킬', width: 4, value: (s) => `${s.totalSoloKills}` },
      ];
    case 'JUNGLE':
      return [
        ...base,
        { header: 'DPM', width: 6, value: (s) => dpm(s.totalDamage, s.totalGameDurationSecs) },
        { header: '오브젝트', width: 5, value: (s) => (s.totalDragonBaron / s.games).toFixed(1) },
        { header: '적정글', width: 5, value: (s) => (s.totalEnemyJungle / s.games).toFixed(1) },
        { header: 'CC', width: 4, value: (s) => `${Math.round(s.totalCcTime / s.games)}` },
      ];
    case 'MIDDLE':
      return [
        ...base,
        { header: 'DPM', width: 6, value: (s) => dpm(s.totalDamage, s.totalGameDurationSecs) },
        { header: 'CS', width: 4, value: (s) => `${Math.round(s.totalCs / s.games)}` },
        {
          header: '골드',
          width: 6,
          value: (s) => Math.round(s.totalGold / s.games).toLocaleString('ko-KR'),
        },
        { header: '솔킬', width: 4, value: (s) => `${s.totalSoloKills}` },
      ];
    case 'BOTTOM':
      return [
        ...base,
        { header: 'DPM', width: 6, value: (s) => dpm(s.totalDamage, s.totalGameDurationSecs) },
        { header: 'CS', width: 4, value: (s) => `${Math.round(s.totalCs / s.games)}` },
        {
          header: '골드',
          width: 6,
          value: (s) => Math.round(s.totalGold / s.games).toLocaleString('ko-KR'),
        },
      ];
    case 'UTILITY':
      return [
        ...base,
        { header: '시야', width: 5, value: (s) => (s.totalVision / s.games).toFixed(1) },
        { header: '와드', width: 5, value: (s) => (s.totalWards / s.games).toFixed(1) },
        { header: 'CC', width: 4, value: (s) => `${Math.round(s.totalCcTime / s.games)}` },
      ];
  }
}

const NAME_WIDTH = 10;

function buildTable(entries: [string, LaneStat][], position: Position, offset: number): string {
  const columns = columnsFor(position);
  const header =
    pad('#', 3) + pad('이름', NAME_WIDTH) + columns.map((c) => pad(c.header, c.width)).join('');
  const lines = entries.map(([name, stat], i) => {
    const rank = offset + i + 1;
    const rankStr = MEDALS[offset + i] ? MEDALS[offset + i] : `${rank}`;
    return (
      pad(rankStr, 3) +
      pad(name, NAME_WIDTH) +
      columns.map((c) => pad(c.value(stat), c.width)).join('')
    );
  });
  return ['```', header, ...lines, '```'].join('\n');
}

function buildEmbed(
  entries: [string, LaneStat][],
  position: Position,
  serverOnly: boolean,
  offset: number,
  page: number,
  totalPages: number,
): EmbedBuilder {
  const meta = POSITION_META[position];
  return new EmbedBuilder()
    .setTitle(`${meta.icon} ${meta.name} 라인 랭킹`)
    .setDescription(buildTable(entries, position, offset))
    .setColor(0x5865f2)
    .setFooter({
      text: `${MIN_GAMES}판 이상 · ${serverOnly ? '서버 기반' : '전체 게임 기준'} · 판수 → 승률 → KDA 순 · ${page + 1}/${totalPages} 페이지`,
    })
    .setTimestamp();
}

function buildButtons(page: number, totalPages: number) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('lane_prev')
      .setLabel('◀ 이전')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId('lane_next')
      .setLabel('다음 ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1),
  );
}

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const position = interaction.options.getString('라인', true) as Position;
  const guildServerId = BigInt(interaction.guildId!);

  const filterResult = readFilterOptions(interaction, { defaultServerOnly: true });
  if (!filterResult.ok) {
    await interaction.editReply(filterResult.error);
    return;
  }
  const serverOnly = filterResult.opts.serverOnly ?? false;

  // 서버 등록 유저 목록
  const users = await prisma.user.findMany({
    where: {
      userGuildServers: { some: { guildServerId } },
      discordUserId: { not: null },
    },
    include: { lolAccounts: true },
  });

  if (users.length === 0) {
    await interaction.editReply('전적 데이터가 없습니다. `/전적갱신` 을 먼저 실행해주세요.');
    return;
  }

  // lolAccountId → discordUserId 역매핑
  const accountIdToDiscord = new Map<bigint, bigint>();
  for (const user of users) {
    for (const acc of user.lolAccounts) {
      accountIdToDiscord.set(acc.id, user.discordUserId!);
    }
  }
  const allAccountIds = [...accountIdToDiscord.keys()];

  const allMatchIds = await getServerMatchIds(await getServerAccountIds(guildServerId));
  const matchIds = await filterMatchIds(allMatchIds, allAccountIds, filterResult.opts);

  if (matchIds.length === 0) {
    await interaction.editReply('조건에 맞는 전적 데이터가 없습니다.');
    return;
  }

  // 해당 포지션 전체 매치 스탯 조회
  const matchStats = await prisma.playerMatchStat.findMany({
    where: { lolAccountId: { in: allAccountIds }, matchId: { in: matchIds }, position },
    select: {
      lolAccountId: true,
      isWin: true,
      kills: true,
      deaths: true,
      assists: true,
      damageDealt: true,
      damageTaken: true,
      cs: true,
      goldEarned: true,
      visionScore: true,
      wardsPlaced: true,
      timeCCingOthers: true,
      killParticipation: true,
      dragonKills: true,
      baronKills: true,
      enemyJungleMinions: true,
      soloKills: true,
      matchRecord: { select: { gameDurationSecs: true } },
    },
  });

  // discordUserId 단위로 집계 (여러 계정 합산)
  const userStatMap = new Map<bigint, LaneStat>();
  for (const s of matchStats) {
    const discordUserId = accountIdToDiscord.get(s.lolAccountId);
    if (!discordUserId) continue;

    const cur = userStatMap.get(discordUserId) ?? {
      games: 0,
      wins: 0,
      kills: 0,
      deaths: 0,
      assists: 0,
      totalDamage: 0,
      totalDamageTaken: 0,
      totalCs: 0,
      totalGold: 0,
      totalVision: 0,
      totalWards: 0,
      totalCcTime: 0,
      totalKillParticipation: 0,
      totalDragonBaron: 0,
      totalEnemyJungle: 0,
      totalSoloKills: 0,
      totalGameDurationSecs: 0,
    };

    cur.games++;
    cur.wins += s.isWin ? 1 : 0;
    cur.kills += s.kills;
    cur.deaths += s.deaths;
    cur.assists += s.assists;
    cur.totalDamage += s.damageDealt;
    cur.totalDamageTaken += s.damageTaken;
    cur.totalCs += s.cs;
    cur.totalGold += s.goldEarned;
    cur.totalVision += s.visionScore;
    cur.totalWards += s.wardsPlaced;
    cur.totalCcTime += s.timeCCingOthers;
    cur.totalKillParticipation += s.killParticipation;
    cur.totalDragonBaron += s.dragonKills + s.baronKills;
    cur.totalEnemyJungle += s.enemyJungleMinions;
    cur.totalSoloKills += s.soloKills;
    cur.totalGameDurationSecs += s.matchRecord.gameDurationSecs;

    userStatMap.set(discordUserId, cur);
  }

  // MIN_GAMES 이상 · 판수 → 승률 → KDA 정렬
  const entries = [...userStatMap.entries()]
    .filter(([, s]) => s.games >= MIN_GAMES)
    .sort(([, a], [, b]) => {
      if (b.games !== a.games) return b.games - a.games;
      const wrA = a.wins / a.games;
      const wrB = b.wins / b.games;
      if (wrB !== wrA) return wrB - wrA;
      const kdaA = (a.kills + a.assists) / Math.max(a.deaths, 1);
      const kdaB = (b.kills + b.assists) / Math.max(b.deaths, 1);
      return kdaB - kdaA;
    });

  const meta = POSITION_META[position];

  if (entries.length === 0) {
    await interaction.editReply(
      `${meta.icon} **${meta.name}** 포지션으로 ${MIN_GAMES}판 이상 플레이한 데이터가 없습니다.`,
    );
    return;
  }

  // 표시 이름 resolve
  const namedEntries: [string, LaneStat][] = await Promise.all(
    entries.map(async ([discordUserId, stat]) => {
      try {
        const member = await interaction.guild!.members.fetch(discordUserId.toString());
        return [member.displayName, stat] as [string, LaneStat];
      } catch {
        return ['어나니머스', stat] as [string, LaneStat];
      }
    }),
  );

  const totalPages = Math.ceil(namedEntries.length / PAGE_SIZE);
  let page = 0;

  const message = await interaction.editReply({
    embeds: [
      buildEmbed(namedEntries.slice(0, PAGE_SIZE), position, serverOnly, 0, page, totalPages),
    ],
    components: totalPages > 1 ? [buildButtons(page, totalPages)] : [],
  });

  if (totalPages <= 1) return;

  const collector = message.createMessageComponentCollector({ time: 300_000 });

  collector.on('collect', async (btn) => {
    try {
      if (btn.user.id !== interaction.user.id) {
        await btn.reply({
          content: '본인이 실행한 명령어에만 사용할 수 있습니다.',
          ephemeral: true,
        });
        return;
      }
      if (btn.customId === 'lane_prev') page--;
      if (btn.customId === 'lane_next') page++;
      const offset = page * PAGE_SIZE;
      await btn.update({
        embeds: [
          buildEmbed(
            namedEntries.slice(offset, offset + PAGE_SIZE),
            position,
            serverOnly,
            offset,
            page,
            totalPages,
          ),
        ],
        components: [buildButtons(page, totalPages)],
      });
    } catch (e) {
      console.error('[라인랭킹] 버튼 처리 오류:', e);
    }
  });

  collector.on('end', async () => {
    await interaction.editReply({ components: [] }).catch(() => {});
  });
}
