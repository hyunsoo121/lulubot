import {
  ActionRowBuilder,
  AutocompleteInteraction,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import { TITLE_DEFINITIONS, getTitleRanking } from '../../../services/titleService';
import prisma from '../../../lib/prisma';

export const data = new SlashCommandBuilder()
  .setName('칭호순위')
  .setDescription('특정 칭호의 서버 내 전체 순위를 조회합니다.')
  .addStringOption((option) =>
    option
      .setName('칭호')
      .setDescription('조회할 칭호 이름')
      .setRequired(true)
      .setAutocomplete(true),
  );

const TITLE_LIST = Object.values(TITLE_DEFINITIONS);
const PAGE_SIZE = 10;
const MEDALS = ['🥇', '🥈', '🥉'];

export async function autocomplete(interaction: AutocompleteInteraction) {
  const focused = interaction.options.getFocused().toLowerCase();
  const filtered = TITLE_LIST.filter(
    (t) => t.name.toLowerCase().includes(focused) || t.code.toLowerCase().includes(focused),
  ).slice(0, 25);
  await interaction.respond(filtered.map((t) => ({ name: `${t.icon} ${t.name}`, value: t.code })));
}

function buildEmbed(
  rows: string[],
  titleCode: string,
  page: number,
  totalPages: number,
): EmbedBuilder {
  const def = TITLE_DEFINITIONS[titleCode];
  return new EmbedBuilder()
    .setTitle(`${def.icon} ${def.name} 순위`)
    .setDescription(rows.join('\n') || '데이터 없음')
    .setColor(0x5865f2)
    .setFooter({
      text: `${def.description} · 3판 이상 기준 · ${page + 1}/${totalPages} 페이지`,
    })
    .setTimestamp();
}

function buildButtons(page: number, totalPages: number) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('titlerank_prev')
      .setLabel('◀ 이전')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId('titlerank_next')
      .setLabel('다음 ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1),
  );
}

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const titleCode = interaction.options.getString('칭호', true);
  const def = TITLE_DEFINITIONS[titleCode];

  if (!def) {
    await interaction.editReply('존재하지 않는 칭호입니다.');
    return;
  }

  const guildServerId = BigInt(interaction.guildId!);
  const ranking = await getTitleRanking(guildServerId, titleCode);

  if (ranking.length === 0) {
    await interaction.editReply(`${def.icon} **${def.name}** 칭호에 대한 데이터가 없습니다.`);
    return;
  }

  // lolAccountId → 표시명 매핑
  const accountIds = ranking.map((r) => r.lolAccountId);
  const accounts = await prisma.lolAccount.findMany({
    where: { id: { in: accountIds } },
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

      const valStr = def.formatValue(r.value);
      return `${medal} **${memberName}** — \`${valStr}\``;
    }),
  );

  const totalPages = Math.ceil(allRows.length / PAGE_SIZE);
  let page = 0;

  const message = await interaction.editReply({
    embeds: [buildEmbed(allRows.slice(0, PAGE_SIZE), titleCode, page, totalPages)],
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
      if (btn.customId === 'titlerank_prev') page--;
      if (btn.customId === 'titlerank_next') page++;
      await btn.update({
        embeds: [
          buildEmbed(
            allRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
            titleCode,
            page,
            totalPages,
          ),
        ],
        components: [buildButtons(page, totalPages)],
      });
    } catch (e) {
      console.error('[칭호순위] 버튼 처리 오류:', e);
    }
  });

  collector.on('end', async () => {
    await interaction.editReply({ components: [] }).catch(() => {});
  });
}
