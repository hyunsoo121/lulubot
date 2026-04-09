import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { getGlobalStatByDiscordId } from '../../../services/stats';
import { getChampionName } from '../../../lib/championNames';
import { getRankedInfo, RiotLeagueEntry } from '../../../services/riot';
import { tierScore, formatTier } from '../../../lib/tierUtils';
import { getTitlesForDiscordUser } from '../../../services/titleService';

export const data = new SlashCommandBuilder()
  .setName('전적')
  .setDescription('전적을 조회합니다.')
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

  const guildServerId = interaction.guildId ? BigInt(interaction.guildId) : null;

  const { accounts, stat, mostChampions } = result;
  const winRate = ((stat.totalWins / stat.totalGames) * 100).toFixed(1);
  const kda =
    stat.totalDeaths > 0
      ? ((stat.totalKills + stat.totalAssists) / stat.totalDeaths).toFixed(2)
      : 'Perfect';
  const avgKills = (stat.totalKills / stat.totalGames).toFixed(1);
  const avgDeaths = (stat.totalDeaths / stat.totalGames).toFixed(1);
  const avgAssists = (stat.totalAssists / stat.totalGames).toFixed(1);

  // 모든 계정의 랭크 정보 조회
  const allEntries: { entry: RiotLeagueEntry; accountName: string }[] = [];
  await Promise.all(
    accounts.map(async (acc) => {
      const entries = await getRankedInfo(acc.puuid);
      entries.forEach((e) =>
        allEntries.push({ entry: e, accountName: `${acc.gameName}#${acc.tagLine}` }),
      );
    }),
  );

  // 솔로/자유 랭크 중 최고 티어 계정 찾기
  function getBestForQueue(queueType: 'RANKED_SOLO_5x5' | 'RANKED_FLEX_SR') {
    const filtered = allEntries.filter((e) => e.entry.queueType === queueType);
    if (filtered.length === 0) return null;
    return filtered.sort((a, b) => tierScore(b.entry) - tierScore(a.entry))[0];
  }

  const bestSolo = getBestForQueue('RANKED_SOLO_5x5');
  const bestFlex = getBestForQueue('RANKED_FLEX_SR');

  const soloStr = bestSolo
    ? `${formatTier(bestSolo.entry)}${accounts.length > 1 ? ` (${bestSolo.accountName})` : ''}`
    : '배치 전';
  const flexStr = bestFlex
    ? `${formatTier(bestFlex.entry)}${accounts.length > 1 ? ` (${bestFlex.accountName})` : ''}`
    : '배치 전';

  // 모스트 챔피언 텍스트
  const mostChampStr = await Promise.all(
    mostChampions.map(async (c, i) => {
      const name = await getChampionName(c.championId);
      const wr = ((c.wins / c.games) * 100).toFixed(0);
      const champKda = c.deaths > 0 ? ((c.kills + c.assists) / c.deaths).toFixed(2) : 'Perfect';
      return `${i + 1}. **${name}** ${c.games}판 ${wr}% KDA ${champKda}`;
    }),
  );

  const accountsStr = accounts.map((a) => `${a.gameName}#${a.tagLine}`).join(', ');

  const embed = new EmbedBuilder()
    .setTitle(`${accountsStr} 전적`)
    .setColor(0x5865f2)
    .addFields(
      { name: '솔로랭크', value: soloStr, inline: true },
      { name: '자유랭크', value: flexStr, inline: true },
      { name: '\u200b', value: '\u200b', inline: true },
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
    .setFooter({ text: '전체 커스텀 게임 기준' })
    .setTimestamp();

  if (mostChampStr.length > 0) {
    embed.addFields({ name: '모스트 챔피언', value: mostChampStr.join('\n'), inline: false });
  }

  if (guildServerId) {
    const titles = await getTitlesForDiscordUser(discordUserId, guildServerId);
    if (titles.length > 0) {
      const titleStr = titles.map((t) => `${t.icon} **${t.name}** — ${t.description}`).join('\n');
      embed.addFields({ name: '보유 칭호', value: titleStr, inline: false });
    }
  }

  await interaction.editReply({ embeds: [embed] });
}
