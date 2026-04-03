import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { getGlobalStatByDiscordId } from '../../../services/stats';
import { getChampionName } from '../../../lib/championNames';

export const data = new SlashCommandBuilder()
  .setName('전체전적')
  .setDescription('전 서버 합산 커리어를 조회합니다.')
  .addUserOption((option) => option.setName('유저').setDescription('조회할 유저 (미입력 시 본인)'));

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const target = interaction.options.getUser('유저') ?? interaction.user;
  const discordUserId = BigInt(target.id);
  const result = await getGlobalStatByDiscordId(discordUserId);

  if (!result || !result.stat) {
    await interaction.editReply(
      target.id === interaction.user.id
        ? '등록된 계정이 없거나 전적 데이터가 없습니다. `/계정등록` 후 `/전적갱신` 을 해주세요.'
        : `${target.displayName} 님의 전적 데이터가 없습니다.`,
    );
    return;
  }

  const { accounts, stat, mostChampions } = result;
  const accountsStr = accounts.map((a) => `${a.gameName}#${a.tagLine}`).join(', ');
  const winRate = ((stat.totalWins / stat.totalGames) * 100).toFixed(1);
  const kda =
    stat.totalDeaths > 0
      ? ((stat.totalKills + stat.totalAssists) / stat.totalDeaths).toFixed(2)
      : 'Perfect';
  const avgKills = (stat.totalKills / stat.totalGames).toFixed(1);
  const avgDeaths = (stat.totalDeaths / stat.totalGames).toFixed(1);
  const avgAssists = (stat.totalAssists / stat.totalGames).toFixed(1);

  const mostChampStr = await Promise.all(
    mostChampions.map(async (c, i) => {
      const name = await getChampionName(c.championId);
      const wr = ((c.wins / c.games) * 100).toFixed(0);
      const kda = c.deaths > 0 ? ((c.kills + c.assists) / c.deaths).toFixed(2) : 'Perfect';
      return `${i + 1}. **${name}** ${c.games}판 ${wr}% KDA ${kda}`;
    }),
  );

  const embed = new EmbedBuilder()
    .setTitle(`${accountsStr} 전체 전적`)
    .setColor(0x5865f2)
    .addFields(
      { name: '총 경기', value: `${stat.totalGames}판`, inline: true },
      {
        name: '승률',
        value: `${winRate}% (${stat.totalWins}승 ${stat.totalGames - stat.totalWins}패)`,
        inline: true,
      },
      { name: 'KDA', value: kda, inline: true },
      { name: '평균 KDA', value: `${avgKills} / ${avgDeaths} / ${avgAssists}`, inline: true },
      { name: 'MVP', value: `${stat.mvpCount}회`, inline: true },
      { name: '펜타킬', value: `${stat.pentaKillCount}회`, inline: true },
    )
    .setFooter({ text: '전체 서버 커스텀 게임 기준 · 모든 등록 계정 합산' })
    .setTimestamp();

  if (mostChampStr.length > 0) {
    embed.addFields({ name: '모스트 챔피언', value: mostChampStr.join('\n'), inline: false });
  }

  await interaction.editReply({ embeds: [embed] });
}
