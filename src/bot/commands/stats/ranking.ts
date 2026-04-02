import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { getServerRanking } from '../../../services/stats';
import prisma from '../../../lib/prisma';

export const data = new SlashCommandBuilder()
  .setName('랭킹')
  .setDescription('서버 멤버의 종합 랭킹을 조회합니다. (전체 커스텀 게임 기준)');

const MEDALS = ['🥇', '🥈', '🥉'];

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
      '전적 데이터가 없습니다. 멤버들이 `/등록` 후 `/전적갱신` 을 해야 합니다.',
    );
    return;
  }

  const rows = await Promise.all(
    entries.map(async ({ discordUserId, accounts, stat }, i) => {
      const medal = MEDALS[i] ?? `**${i + 1}.**`;

      // Discord 멤버 표시 이름 조회
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
      const kda = ((stat.totalKills + stat.totalAssists) / Math.max(stat.totalDeaths, 1)).toFixed(
        2,
      );
      return `${medal} **${memberName}** (${accountsStr})　${wr}% (${stat.totalWins}승 ${stat.totalGames - stat.totalWins}패)　KDA ${kda}`;
    }),
  );

  const embed = new EmbedBuilder()
    .setTitle('🏆 서버 랭킹')
    .setDescription(rows.join('\n'))
    .setColor(0xffd700)
    .setFooter({ text: '전체 커스텀 게임 기준 · 승률 → KDA 순 정렬' })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
