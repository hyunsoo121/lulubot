import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import prisma from '../../../lib/prisma';

const PAGE_SIZE = 10;

export const data = new SlashCommandBuilder()
  .setName('듀오')
  .setDescription('서버 내 듀오(같이 플레이한) 통계를 조회합니다.')
  .addStringOption((option) =>
    option
      .setName('유형')
      .setDescription('조회 유형')
      .setRequired(false)
      .addChoices(
        { name: '같은팀 승률', value: 'same_wr' },
        { name: '적팀 승률', value: 'against_wr' },
        { name: '같이 플레이 횟수', value: 'same_games' },
      ),
  );

interface DuoRow {
  name1: string;
  name2: string;
  sameTeamGames: number;
  sameTeamWins: number;
  againstGames: number;
  againstWins: number;
}

function buildEmbed(
  rows: DuoRow[],
  sortType: string,
  page: number,
  totalPages: number,
): EmbedBuilder {
  const sortLabel: Record<string, string> = {
    same_wr: '같은팀 승률',
    against_wr: '적팀 승률',
    same_games: '같이 플레이 횟수',
  };

  const lines = rows.map((row, idx) => {
    const rank = page * PAGE_SIZE + idx + 1;
    const sameWr =
      row.sameTeamGames > 0
        ? ((row.sameTeamWins / row.sameTeamGames) * 100).toFixed(1)
        : '—';
    const againstWr =
      row.againstGames > 0
        ? ((row.againstWins / row.againstGames) * 100).toFixed(1)
        : '—';

    return [
      `**${rank}.** ${row.name1} & ${row.name2}`,
      `　같은팀: ${row.sameTeamGames}전 ${row.sameTeamWins}승 (${sameWr}%)` +
        `　상대팀: ${row.againstGames}전 ${row.againstWins}승 (${againstWr}%)`,
    ].join('\n');
  });

  return new EmbedBuilder()
    .setTitle(`🤝 듀오 통계 — ${sortLabel[sortType] ?? '같이 플레이 횟수'}`)
    .setColor(0x5865f2)
    .setDescription(lines.length > 0 ? lines.join('\n\n') : '데이터가 없습니다.')
    .setFooter({ text: `페이지 ${page + 1}/${totalPages}` })
    .setTimestamp();
}

function buildButtons(page: number, totalPages: number): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('duo_prev')
      .setLabel('◀ 이전')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId('duo_next')
      .setLabel('다음 ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1),
  );
}

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const guildServerId = interaction.guildId ? BigInt(interaction.guildId) : null;
  if (!guildServerId) {
    await interaction.editReply('서버 전용 커맨드입니다.');
    return;
  }

  const sortType = interaction.options.getString('유형') ?? 'same_games';

  const allStats = await prisma.duoStat.findMany({
    where: { guildServerId },
    include: {
      lolAccount1: true,
      lolAccount2: true,
    },
  });

  if (allStats.length === 0) {
    await interaction.editReply('아직 듀오 데이터가 없습니다. 전적 갱신 후 다시 시도해주세요.');
    return;
  }

  const rows: DuoRow[] = allStats.map((s) => ({
    name1: `${s.lolAccount1.gameName}#${s.lolAccount1.tagLine}`,
    name2: `${s.lolAccount2.gameName}#${s.lolAccount2.tagLine}`,
    sameTeamGames: s.sameTeamGames,
    sameTeamWins: s.sameTeamWins,
    againstGames: s.againstGames,
    againstWins: s.againstWins,
  }));

  // 정렬
  if (sortType === 'same_wr') {
    rows.sort((a, b) => {
      const wrA = a.sameTeamGames >= 5 ? a.sameTeamWins / a.sameTeamGames : -1;
      const wrB = b.sameTeamGames >= 5 ? b.sameTeamWins / b.sameTeamGames : -1;
      return wrB - wrA;
    });
  } else if (sortType === 'against_wr') {
    rows.sort((a, b) => {
      const wrA = a.againstGames >= 5 ? a.againstWins / a.againstGames : -1;
      const wrB = b.againstGames >= 5 ? b.againstWins / b.againstGames : -1;
      return wrB - wrA;
    });
  } else {
    // same_games (기본)
    rows.sort((a, b) => b.sameTeamGames + b.againstGames - (a.sameTeamGames + a.againstGames));
  }

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  let page = 0;

  const pageRows = () => rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const message = await interaction.editReply({
    embeds: [buildEmbed(pageRows(), sortType, page, totalPages)],
    components: totalPages > 1 ? [buildButtons(page, totalPages)] : [],
  });

  if (totalPages <= 1) return;

  const collector = message.createMessageComponentCollector({ time: 300_000 });

  collector.on('collect', async (btn) => {
    try {
      if (btn.user.id !== interaction.user.id) {
        await btn.reply({ content: '본인이 실행한 명령어에만 사용할 수 있습니다.', ephemeral: true });
        return;
      }
      if (btn.customId === 'duo_prev') page--;
      if (btn.customId === 'duo_next') page++;
      await btn.update({
        embeds: [buildEmbed(pageRows(), sortType, page, totalPages)],
        components: [buildButtons(page, totalPages)],
      });
    } catch (e) {
      console.error('[듀오] 버튼 처리 오류:', e);
    }
  });

  collector.on('end', async () => {
    await interaction.editReply({ components: [] }).catch(() => {});
  });
}
