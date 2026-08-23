import {
  ActionRowBuilder,
  AutocompleteInteraction,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import { getChampionRanking } from '../../../services/stats';
import { getAllChampions, getChampionName } from '../../../lib/championNames';
import { readFilterOptions } from '../shared/filterOptions';
import prisma from '../../../lib/prisma';

export const data = new SlashCommandBuilder()
  .setName('챔피언랭킹')
  .setDescription('서버 내 특정 챔피언 랭킹을 조회합니다. (3판 이상 기준)')
  .addStringOption((option) =>
    option
      .setName('챔피언')
      .setDescription('조회할 챔피언')
      .setRequired(true)
      .setAutocomplete(true),
  )
  .addBooleanOption((option) =>
    option
      .setName('서버기반')
      .setDescription('서버 등록 계정끼리만 진행된 매치만 포함 (참가자 8명 이상)')
      .setRequired(false),
  )
  .addStringOption((option) =>
    option.setName('시작일').setDescription('YYYY-MM-DD (이 날짜 이후 매치만)').setRequired(false),
  )
  .addStringOption((option) =>
    option.setName('종료일').setDescription('YYYY-MM-DD (이 날짜 이전 매치만)').setRequired(false),
  );

const PAGE_SIZE = 10;
const MEDALS = ['🥇', '🥈', '🥉'];

export async function autocomplete(interaction: AutocompleteInteraction) {
  const focused = interaction.options.getFocused().toLowerCase();
  const champions = await getAllChampions();
  const filtered = champions.filter((c) => c.name.toLowerCase().includes(focused)).slice(0, 25);
  await interaction.respond(filtered.map((c) => ({ name: c.name, value: String(c.id) })));
}

function buildEmbed(rows: string[], championName: string, page: number, totalPages: number) {
  return new EmbedBuilder()
    .setTitle(`${championName} 랭킹`)
    .setDescription(rows.join('\n') || '데이터 없음')
    .setColor(0x5865f2)
    .setFooter({ text: `3판 이상 기준 · 승률 → KDA 순 정렬 · ${page + 1}/${totalPages} 페이지` })
    .setTimestamp();
}

function buildButtons(page: number, totalPages: number) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('champrank_prev')
      .setLabel('◀ 이전')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId('champrank_next')
      .setLabel('다음 ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1),
  );
}

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const championIdStr = interaction.options.getString('챔피언', true);
  const championId = Number(championIdStr);
  if (!Number.isInteger(championId)) {
    await interaction.editReply('❌ 챔피언을 자동완성 목록에서 선택해주세요.');
    return;
  }

  const filterResult = readFilterOptions(interaction);
  if (!filterResult.ok) {
    await interaction.editReply(filterResult.error);
    return;
  }

  const guildServerId = BigInt(interaction.guildId!);
  const championName = await getChampionName(championId);
  const ranking = await getChampionRanking(guildServerId, championId, filterResult.opts);

  if (ranking.length === 0) {
    await interaction.editReply(`${championName} 랭킹 데이터가 없습니다. (3판 이상 플레이 필요)`);
    return;
  }

  const accounts = await prisma.lolAccount.findMany({
    where: { id: { in: ranking.map((r) => r.lolAccountId) } },
    include: { user: true },
  });
  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  const allRows = await Promise.all(
    ranking.map(async (r, i) => {
      const medal = MEDALS[i] ?? `**${i + 1}.**`;
      const acc = accountMap.get(r.lolAccountId);
      let memberName = acc ? `${acc.gameName}#${acc.tagLine}` : '알 수 없음';
      if (acc?.user?.discordUserId) {
        try {
          const member = await interaction.guild!.members.fetch(acc.user.discordUserId.toString());
          memberName = `${member.displayName} (${acc.gameName}#${acc.tagLine})`;
        } catch {
          // 서버 미접속
        }
      }
      const wr = ((r.wins / r.games) * 100).toFixed(1);
      const kda = ((r.kills + r.assists) / Math.max(r.deaths, 1)).toFixed(2);
      return `${medal} **${memberName}** — ${r.games}판 ${wr}% KDA ${kda}`;
    }),
  );

  const totalPages = Math.ceil(allRows.length / PAGE_SIZE);
  let page = 0;

  const message = await interaction.editReply({
    embeds: [buildEmbed(allRows.slice(0, PAGE_SIZE), championName, page, totalPages)],
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
      if (btn.customId === 'champrank_prev') page--;
      if (btn.customId === 'champrank_next') page++;
      await btn.update({
        embeds: [
          buildEmbed(
            allRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
            championName,
            page,
            totalPages,
          ),
        ],
        components: [buildButtons(page, totalPages)],
      });
    } catch (e) {
      console.error('[챔피언랭킹] 버튼 처리 오류:', e);
    }
  });

  collector.on('end', async () => {
    await interaction.editReply({ components: [] }).catch(() => {});
  });
}
