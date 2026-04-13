import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import { TITLE_DEFINITIONS } from '../../../services/titleService';
import prisma from '../../../lib/prisma';

export const data = new SlashCommandBuilder()
  .setName('칭호')
  .setDescription('이 서버의 칭호 보유자 목록을 조회합니다.');

type UserTitleWithAccount = Awaited<
  ReturnType<
    typeof prisma.userTitle.findMany<{ include: { lolAccount: { include: { user: true } } } }>
  >
>[number];

const CATEGORIES: { name: string; codes: string[] }[] = [
  {
    name: '⚔️ 전투',
    codes: ['학살자', '생존왕', '킹메이커', '퍼블전문가', '펜타킬러', '쿼드라킬러'],
  },
  { name: '💢 딜/탱', codes: ['DPM머신', '샌드백', '철거왕', '딜폭군', '금고', '골드효율'] },
  { name: '🐉 오브젝트', codes: ['용사냥꾼', '바론사냥꾼'] },
  { name: '🌾 CS/경제', codes: ['CS왕', '골드킹'] },
  { name: '👁️ 시야', codes: ['만물의눈', '와드장인', '청소부', '타임스토프', '핑와장인'] },
  {
    name: '🎲 기타',
    codes: [
      '투명인간',
      '솔로킹',
      '흑백모니터',

      '불사신',
      '개근상',
      '연승왕',
      '연패왕',
      '끈기왕',
      '속전속결',
      '신인왕',
    ],
  },
  { name: '🏔️ 탑', codes: ['TOPKING', '전사왕', '고기방패', '고속도로건설자', '라인전의악마'] },
  { name: '🌲 정글', codes: ['JUGKING', '포식자', '오브젝트마스터', '작전명왕호야', '대도둑'] },
  { name: '🔮 미드', codes: ['MIDKING', '황족', '미드DPM', '로밍킹', '미드솔로킬러'] },
  { name: '🏹 원딜', codes: ['ADKING', '해결사', '금수저', '평타싸개', '존윅'] },
  { name: '💊 서폿', codes: ['SUPKING', '그림자', '와드싸개', '경호원', '베이비시터'] },
];

// 카테고리를 페이지 단위로 묶음
const PAGES: { name: string; codes: string[] }[][] = [
  CATEGORIES.slice(0, 4), // 전투, 딜/탱, 오브젝트, CS/경제
  CATEGORIES.slice(4, 6), // 시야, 기타
  CATEGORIES.slice(6, 8), // 탑, 정글
  CATEGORIES.slice(8, 11), // 미드, 원딜, 서폿
];

async function getHolderName(
  title: UserTitleWithAccount,
  interaction: ChatInputCommandInteraction,
): Promise<string> {
  const acc = title.lolAccount;
  const accountStr = `${acc.gameName}#${acc.tagLine}`;
  if (acc.user?.discordUserId) {
    try {
      const member = await interaction.guild!.members.fetch(acc.user.discordUserId.toString());
      return `${member.displayName} (${accountStr})`;
    } catch {}
  }
  return accountStr;
}

async function buildEmbed(
  page: number,
  userTitles: UserTitleWithAccount[],
  interaction: ChatInputCommandInteraction,
): Promise<EmbedBuilder> {
  const embed = new EmbedBuilder()
    .setTitle('🏅 서버 칭호 보유자')
    .setColor(0x5865f2)
    .setTimestamp()
    .setFooter({
      text: `페이지 ${page + 1}/${PAGES.length} · /전적갱신 시 재계산 · 동점 시 공동 수상`,
    });

  for (const category of PAGES[page]) {
    const lines: string[] = [];

    for (const code of category.codes) {
      const holders = userTitles.filter((t) => t.titleCode === code);
      const def = TITLE_DEFINITIONS[code];
      if (!def) continue;

      if (holders.length === 0) {
        lines.push(`${def.icon} **${def.name}**\n　*${def.description} — 없음*`);
        continue;
      }

      const holderNames = await Promise.all(holders.map((t) => getHolderName(t, interaction)));
      const statStr = holders[0].statValue != null ? def.formatValue(holders[0].statValue) : '';
      const holderStr = holderNames.join(', ');

      lines.push(
        `${def.icon} **${def.name}** · *${def.description}*\n　${statStr ? `\`${statStr}\` ` : ''}${holderStr}`,
      );
    }

    if (lines.length > 0) {
      embed.addFields({ name: category.name, value: lines.join('\n'), inline: false });
    }
  }

  return embed;
}

function buildButtons(page: number): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('title_prev')
      .setLabel('◀ 이전')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId('title_next')
      .setLabel('다음 ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= PAGES.length - 1),
  );
}

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const guildServerId = BigInt(interaction.guildId!);

  const userTitles = await prisma.userTitle.findMany({
    where: { guildServerId },
    include: { lolAccount: { include: { user: true } } },
  });

  if (userTitles.length === 0) {
    await interaction.editReply('아직 칭호 데이터가 없습니다. `/전적갱신` 을 먼저 실행해주세요.');
    return;
  }

  let page = 0;
  const embed = await buildEmbed(page, userTitles, interaction);
  const message = await interaction.editReply({
    embeds: [embed],
    components: [buildButtons(page)],
  });

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

      if (btn.customId === 'title_prev') page--;
      if (btn.customId === 'title_next') page++;

      const newEmbed = await buildEmbed(page, userTitles, interaction);
      await btn.update({ embeds: [newEmbed], components: [buildButtons(page)] });
    } catch (e) {
      console.error('[칭호] 버튼 처리 오류:', e);
    }
  });

  collector.on('end', async () => {
    await interaction.editReply({ components: [] }).catch(() => {});
  });
}
