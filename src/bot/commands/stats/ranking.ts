import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import { getServerRanking } from '../../../services/stats';
import prisma from '../../../lib/prisma';

export const data = new SlashCommandBuilder()
  .setName('랭킹')
  .setDescription('서버 멤버의 종합 랭킹을 조회합니다. (전체 커스텀 게임 기준)');

const MEDALS = ['🥇', '🥈', '🥉'];
const PAGE_SIZE = 10;

async function buildRows(
  entries: Awaited<ReturnType<typeof getServerRanking>>,
  interaction: ChatInputCommandInteraction,
  offset: number,
) {
  const page = entries.slice(offset, offset + PAGE_SIZE);

  return Promise.all(
    page.map(async ({ discordUserId, accounts, stat }, i) => {
      const rank = offset + i;
      const medal = MEDALS[rank] ?? `**${rank + 1}.**`;

      let memberName: string;
      try {
        const member = await interaction.guild!.members.fetch(discordUserId.toString());
        memberName = member.displayName;
      } catch {
        memberName = '어나니머스';
      }

      const accountsStr = accounts.map((a) => `${a.gameName}#${a.tagLine}`).join(', ');

      if (!stat || stat.totalGames === 0) {
        return `${medal} **${memberName}** (${accountsStr})　*전적 없음 — /전적갱신 필요*`;
      }

      const wr = ((stat.totalWins / stat.totalGames) * 100).toFixed(1);
      const kda = ((stat.totalKills + stat.totalAssists) / Math.max(stat.totalDeaths, 1)).toFixed(2);
      return `${medal} **${memberName}** (${accountsStr})　${wr}% (${stat.totalWins}승 ${stat.totalGames - stat.totalWins}패)　KDA ${kda}`;
    }),
  );
}

function buildEmbed(rows: string[], page: number, totalPages: number) {
  return new EmbedBuilder()
    .setTitle('🏆 서버 랭킹')
    .setDescription(rows.join('\n'))
    .setColor(0xffd700)
    .setFooter({ text: `전체 커스텀 게임 기준 · 승률 → KDA 순 정렬 · ${page + 1}/${totalPages} 페이지` })
    .setTimestamp();
}

function buildButtons(page: number, totalPages: number) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('ranking_prev')
      .setLabel('◀ 이전')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId('ranking_next')
      .setLabel('다음 ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1),
  );
}

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const guildServerId = BigInt(interaction.guildId!);

  await prisma.guildServer.upsert({
    where: { id: guildServerId },
    update: {},
    create: { id: guildServerId, serverName: interaction.guild?.name },
  });

  const entries = await getServerRanking(guildServerId);

  if (entries.length === 0) {
    await interaction.editReply(
      '전적 데이터가 없습니다. 멤버들이 `/계정등록` 후 `/전적갱신` 을 해야 합니다.',
    );
    return;
  }

  const totalPages = Math.ceil(entries.length / PAGE_SIZE);
  let page = 0;

  const rows = await buildRows(entries, interaction, page * PAGE_SIZE);
  const message = await interaction.editReply({
    embeds: [buildEmbed(rows, page, totalPages)],
    components: totalPages > 1 ? [buildButtons(page, totalPages)] : [],
  });

  if (totalPages <= 1) return;

  const collector = message.createMessageComponentCollector({ time: 60_000 });

  collector.on('collect', async (btn) => {
    if (btn.user.id !== interaction.user.id) {
      await btn.reply({ content: '본인이 실행한 명령어에만 사용할 수 있습니다.', ephemeral: true });
      return;
    }

    if (btn.customId === 'ranking_prev') page--;
    if (btn.customId === 'ranking_next') page++;

    const newRows = await buildRows(entries, interaction, page * PAGE_SIZE);
    await btn.update({
      embeds: [buildEmbed(newRows, page, totalPages)],
      components: [buildButtons(page, totalPages)],
    });
  });

  collector.on('end', async () => {
    await interaction.editReply({ components: [] }).catch(() => {});
  });
}
