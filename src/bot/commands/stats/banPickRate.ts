import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import { getBanPickStats, BanPickRow, BanPickStats } from '../../../services/stats';
import { getChampionName } from '../../../lib/championNames';

export const data = new SlashCommandBuilder()
  .setName('밴픽률')
  .setDescription('서버 내전 기준 챔피언 밴픽률 전체 순위를 조회합니다. (서버 기반)');

const PAGE_SIZE = 10;
const MEDALS = ['🥇', '🥈', '🥉'];

async function formatRow(rank: number, row: BanPickRow, stats: BanPickStats): Promise<string> {
  const medal = MEDALS[rank] ?? `**${rank + 1}.**`;
  const name = await getChampionName(row.championId);
  const contest = (row.contestRate * 100).toFixed(1);
  const ban = (row.banRate * 100).toFixed(1);
  const pick = (row.pickRate * 100).toFixed(1);
  const winStr =
    row.winRate != null ? `${(row.winRate * 100).toFixed(1)}% (${row.wins}/${row.pickCount})` : '-';

  return (
    `${medal} **${name}** — 밴픽률 ${contest}%\n` +
    `　밴 ${ban}% (${row.banCount}/${stats.totalMatchesWithBanData}) · ` +
    `픽 ${pick}% (${row.pickCount}/${stats.totalMatches}) · ` +
    `승률 ${winStr}`
  );
}

async function buildEmbed(
  stats: BanPickStats,
  page: number,
  totalPages: number,
): Promise<EmbedBuilder> {
  const pageRows = stats.rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const lines = await Promise.all(
    pageRows.map((row, i) => formatRow(page * PAGE_SIZE + i, row, stats)),
  );

  return new EmbedBuilder()
    .setTitle('🚫 챔피언 밴픽률')
    .setColor(0x5865f2)
    .setDescription(lines.join('\n\n') || '데이터 없음')
    .setFooter({
      text:
        stats.totalMatchesWithBanData === 0
          ? `밴 데이터는 이 기능 도입 이후 갱신된 매치부터만 집계됩니다 · ${page + 1}/${totalPages} 페이지`
          : `밴픽률순 정렬 · ${page + 1}/${totalPages} 페이지`,
    })
    .setTimestamp();
}

function buildButtons(page: number, totalPages: number) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('banpick_prev')
      .setLabel('◀ 이전')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId('banpick_next')
      .setLabel('다음 ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1),
  );
}

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const guildServerId = BigInt(interaction.guildId!);
  const stats = await getBanPickStats(guildServerId);

  if (stats.totalMatches === 0) {
    await interaction.editReply(
      '전적 데이터가 없습니다. 멤버들이 `/계정등록` 후 `/전적갱신` 을 해야 합니다.',
    );
    return;
  }

  if (stats.rows.length === 0) {
    await interaction.editReply('밴픽 데이터가 없습니다.');
    return;
  }

  const totalPages = Math.ceil(stats.rows.length / PAGE_SIZE);
  let page = 0;

  const message = await interaction.editReply({
    embeds: [await buildEmbed(stats, page, totalPages)],
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
      if (btn.customId === 'banpick_prev') page--;
      if (btn.customId === 'banpick_next') page++;
      await btn.update({
        embeds: [await buildEmbed(stats, page, totalPages)],
        components: [buildButtons(page, totalPages)],
      });
    } catch (e) {
      console.error('[밴픽률] 버튼 처리 오류:', e);
    }
  });

  collector.on('end', async () => {
    await interaction.editReply({ components: [] }).catch(() => {});
  });
}
