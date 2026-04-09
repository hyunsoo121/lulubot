import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import { getMostChampions } from '../../../services/stats';
import { getChampionName } from '../../../lib/championNames';

export const data = new SlashCommandBuilder()
  .setName('모스트챔피언')
  .setDescription('챔피언별 전적을 조회합니다.')
  .addUserOption((option) =>
    option.setName('유저').setDescription('조회할 유저 (미입력 시 본인)').setRequired(false),
  );

const PAGE_SIZE = 5;

async function buildRows(champions: Awaited<ReturnType<typeof getMostChampions>>, offset: number) {
  const page = champions.slice(offset, offset + PAGE_SIZE);
  return Promise.all(
    page.map(async (c, i) => {
      const rank = offset + i + 1;
      const name = await getChampionName(c.championId);
      const wr = ((c.wins / c.games) * 100).toFixed(1);
      const kda = c.deaths > 0 ? ((c.kills + c.assists) / c.deaths).toFixed(2) : 'Perfect';
      const avgK = (c.kills / c.games).toFixed(1);
      const avgD = (c.deaths / c.games).toFixed(1);
      const avgA = (c.assists / c.games).toFixed(1);
      return `**${rank}. ${name}**　${c.games}판　${wr}% (${c.wins}승 ${c.games - c.wins}패)　KDA ${kda} (${avgK}/${avgD}/${avgA})`;
    }),
  );
}

function buildEmbed(rows: string[], targetName: string, page: number, totalPages: number) {
  return new EmbedBuilder()
    .setTitle(`${targetName} 모스트 챔피언`)
    .setDescription(rows.join('\n'))
    .setColor(0x5865f2)
    .setFooter({ text: `판수 → 승률 → KDA 순 정렬 · ${page + 1}/${totalPages} 페이지` })
    .setTimestamp();
}

function buildButtons(page: number, totalPages: number) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('champ_prev')
      .setLabel('◀ 이전')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId('champ_next')
      .setLabel('다음 ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1),
  );
}

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const target = interaction.options.getUser('유저') ?? interaction.user;
  const discordUserId = BigInt(target.id);
  const champions = await getMostChampions(discordUserId);

  if (champions.length === 0) {
    await interaction.editReply(
      target.id === interaction.user.id
        ? '전적 데이터가 없습니다. `/계정등록` 후 `/전적갱신` 을 해주세요.'
        : `${target.displayName} 님의 전적 데이터가 없습니다.`,
    );
    return;
  }

  const totalPages = Math.ceil(champions.length / PAGE_SIZE);
  let page = 0;
  const targetName = target.displayName;

  const rows = await buildRows(champions, page * PAGE_SIZE);
  const message = await interaction.editReply({
    embeds: [buildEmbed(rows, targetName, page, totalPages)],
    components: totalPages > 1 ? [buildButtons(page, totalPages)] : [],
  });

  if (totalPages <= 1) return;

  const collector = message.createMessageComponentCollector({ time: 60_000 });

  collector.on('collect', async (btn) => {
    if (btn.user.id !== interaction.user.id) {
      await btn.reply({ content: '본인이 실행한 명령어에만 사용할 수 있습니다.', ephemeral: true });
      return;
    }

    if (btn.customId === 'champ_prev') page--;
    if (btn.customId === 'champ_next') page++;

    const newRows = await buildRows(champions, page * PAGE_SIZE);
    await btn.update({
      embeds: [buildEmbed(newRows, targetName, page, totalPages)],
      components: [buildButtons(page, totalPages)],
    });
  });

  collector.on('end', async () => {
    await interaction.editReply({ components: [] }).catch(() => {});
  });
}
