import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import { getDuoRanking } from '../../../services/stats';
import prisma from '../../../lib/prisma';

const PAGE_SIZE = 10;

export const data = new SlashCommandBuilder()
  .setName('듀오전적')
  .setDescription('서버 내 듀오(같이 플레이한) 전적을 조회합니다. (서버 기반)')
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

  // 유형별로 그 유형에 필요한 정보만 보여준다 (상대팀 승률은 누구 기준인지 헷갈려서 아예 뺌)
  const lines = rows.map((row, idx) => {
    const rank = page * PAGE_SIZE + idx + 1;
    const sameTeamLosses = row.sameTeamGames - row.sameTeamWins;
    const sameWr =
      row.sameTeamGames > 0 ? ((row.sameTeamWins / row.sameTeamGames) * 100).toFixed(1) : '—';

    if (sortType === 'against_wr') {
      // 상대팀(서로 다른 팀)일 땐 한쪽이 이기면 한쪽이 지므로, "승률" 하나만 보여주면
      // 누구 기준인지 알 수 없다 — 승수가 더 많은 쪽을 왼쪽에 두고 한 줄로 표시.
      // 우위가 있으면 👑 표시(동률이면 표시 없음), %는 왼쪽(승수 많은 쪽) 기준 승률.
      const name1Wins = row.againstWins;
      const name2Wins = row.againstGames - row.againstWins;
      const [leftName, leftWins, rightName, rightWins] =
        name1Wins >= name2Wins
          ? [row.name1, name1Wins, row.name2, name2Wins]
          : [row.name2, name2Wins, row.name1, name1Wins];
      const crown = leftWins > rightWins ? '👑 ' : '';
      const winRate =
        row.againstGames > 0 ? ((leftWins / row.againstGames) * 100).toFixed(1) : '0.0';
      const header = `**${rank}.** ${crown}${leftName} & ${rightName} (${winRate}%)`;
      return (
        `${header}\n　상대팀(${row.againstGames}전): ` +
        `${leftName} ${leftWins}승 · ${rightName} ${rightWins}승`
      );
    }

    const header = `**${rank}.** ${row.name1} & ${row.name2}`;

    if (sortType === 'same_wr') {
      return `${header}\n　같은팀: ${row.sameTeamWins}승 ${sameTeamLosses}패 (${sameWr}%)`;
    }

    // same_games (기본) — 같이 플레이한(같은팀) 횟수 순, 옆에 같은팀 승률만 표시
    return `${header}\n　같은팀 ${row.sameTeamGames}판 (승률 ${sameWr}%)`;
  });

  return new EmbedBuilder()
    .setTitle(`🤝 듀오 전적 — ${sortLabel[sortType] ?? '같이 플레이 횟수'}`)
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

  const duoRanking = await getDuoRanking(guildServerId, { serverOnly: true });

  if (duoRanking.length === 0) {
    await interaction.editReply('아직 듀오 데이터가 없습니다. 전적 갱신 후 다시 시도해주세요.');
    return;
  }

  const accountIds = [...new Set(duoRanking.flatMap((d) => [d.lolAccountId1, d.lolAccountId2]))];
  const accounts = await prisma.lolAccount.findMany({ where: { id: { in: accountIds } } });
  const accountMap = new Map(accounts.map((a) => [a.id, a]));
  const nameOf = (id: bigint) => {
    const a = accountMap.get(id);
    return a ? `${a.gameName}#${a.tagLine}` : '알 수 없음';
  };

  const rows: DuoRow[] = duoRanking.map((d) => ({
    name1: nameOf(d.lolAccountId1),
    name2: nameOf(d.lolAccountId2),
    sameTeamGames: d.sameTeamGames,
    sameTeamWins: d.sameTeamWins,
    againstGames: d.againstGames,
    againstWins: d.againstWins,
  }));

  // 정렬
  if (sortType === 'same_wr') {
    rows.sort((a, b) => {
      const wrA = a.sameTeamGames >= 5 ? a.sameTeamWins / a.sameTeamGames : -1;
      const wrB = b.sameTeamGames >= 5 ? b.sameTeamWins / b.sameTeamGames : -1;
      return wrB - wrA;
    });
  } else if (sortType === 'against_wr') {
    // "이름1 기준 승률"로만 정렬하면 이름2가 일방적으로 이기는 매치업이 묻힌다.
    // 50%에서 얼마나 치우쳤는지(둘 중 누가 우세하든 상관없이)로 정렬해야
    // 진짜 "일방적인 상대 전적"이 위로 올라온다.
    const skew = (row: DuoRow) => {
      if (row.againstGames < 5) return -1;
      const rate = row.againstWins / row.againstGames;
      return Math.max(rate, 1 - rate);
    };
    rows.sort((a, b) => skew(b) - skew(a));
  } else {
    // same_games (기본) — "같이 플레이"는 같은 팀으로 뛴 것만 의미
    rows.sort((a, b) => b.sameTeamGames - a.sameTeamGames);
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
        await btn.reply({
          content: '본인이 실행한 명령어에만 사용할 수 있습니다.',
          ephemeral: true,
        });
        return;
      }
      if (btn.customId === 'duo_prev') page--;
      if (btn.customId === 'duo_next') page++;
      await btn.update({
        embeds: [buildEmbed(pageRows(), sortType, page, totalPages)],
        components: [buildButtons(page, totalPages)],
      });
    } catch (e) {
      console.error('[듀오전적] 버튼 처리 오류:', e);
    }
  });

  collector.on('end', async () => {
    await interaction.editReply({ components: [] }).catch(() => {});
  });
}
