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

export const data = new SlashCommandBuilder()
  .setName('라인랭킹')
  .setDescription('라인별 특화 스탯 랭킹을 조회합니다. (서버 기반)')
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
  );

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

function formatLine(rank: number, name: string, stat: LaneStat, position: Position): string {
  const wr = ((stat.wins / stat.games) * 100).toFixed(1);
  const kda = ((stat.kills + stat.assists) / Math.max(stat.deaths, 1)).toFixed(2);
  const kp = ((stat.totalKillParticipation / stat.games) * 100).toFixed(0);
  const dmgPm = dpm(stat.totalDamage, stat.totalGameDurationSecs);
  const base = `${stat.games}판 ${wr}% KDA ${kda} 킬관여 ${kp}%`;

  let extra: string;
  switch (position) {
    case 'TOP': {
      const tankPm = dpm(stat.totalDamageTaken, stat.totalGameDurationSecs);
      extra = `DPM ${dmgPm} | 탱킹/분 ${tankPm} | 솔로킬 ${stat.totalSoloKills}회`;
      break;
    }
    case 'JUNGLE': {
      const avgObj = (stat.totalDragonBaron / stat.games).toFixed(1);
      const avgSteal = (stat.totalEnemyJungle / stat.games).toFixed(1);
      const avgCc = Math.round(stat.totalCcTime / stat.games);
      extra = `DPM ${dmgPm} | 오브젝트 ${avgObj} | 적정글 ${avgSteal}개 | CC ${avgCc}초`;
      break;
    }
    case 'MIDDLE': {
      const avgCs = Math.round(stat.totalCs / stat.games);
      const avgGold = Math.round(stat.totalGold / stat.games).toLocaleString('ko-KR');
      extra = `DPM ${dmgPm} | CS ${avgCs} | 골드 ${avgGold} | 솔로킬 ${stat.totalSoloKills}회`;
      break;
    }
    case 'BOTTOM': {
      const avgCs = Math.round(stat.totalCs / stat.games);
      const avgGold = Math.round(stat.totalGold / stat.games).toLocaleString('ko-KR');
      extra = `DPM ${dmgPm} | CS ${avgCs} | 골드 ${avgGold}`;
      break;
    }
    case 'UTILITY': {
      const avgVision = (stat.totalVision / stat.games).toFixed(1);
      const avgWards = (stat.totalWards / stat.games).toFixed(1);
      const avgCc = Math.round(stat.totalCcTime / stat.games);
      extra = `시야 ${avgVision} | 와드 ${avgWards}개 | CC ${avgCc}초`;
      break;
    }
  }

  return `**${rank}. ${name}**　${base} | ${extra}`;
}

function buildEmbed(
  entries: [string, LaneStat][],
  position: Position,
  offset: number,
  page: number,
  totalPages: number,
): EmbedBuilder {
  const meta = POSITION_META[position];
  const rows = entries.map(([name, stat], i) => formatLine(offset + i + 1, name, stat, position));
  return new EmbedBuilder()
    .setTitle(`${meta.icon} ${meta.name} 라인 랭킹`)
    .setDescription(rows.join('\n'))
    .setColor(0x5865f2)
    .setFooter({
      text: `${MIN_GAMES}판 이상 · 서버 기반 · 판수 → 승률 → KDA 순 · ${page + 1}/${totalPages} 페이지`,
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
  const matchIds = await filterMatchIds(allMatchIds, allAccountIds, { serverOnly: true });

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
    embeds: [buildEmbed(namedEntries.slice(0, PAGE_SIZE), position, 0, page, totalPages)],
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
