import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder, User } from 'discord.js';
import { getComparisonStat, CompareStat } from '../../../services/stats';
import { readFilterOptions } from '../shared/filterOptions';

export const data = new SlashCommandBuilder()
  .setName('전적비교')
  .setDescription('두 유저의 전적을 나란히 비교합니다.')
  .addUserOption((option) =>
    option.setName('유저1').setDescription('첫 번째 유저').setRequired(true),
  )
  .addUserOption((option) =>
    option.setName('유저2').setDescription('두 번째 유저').setRequired(true),
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

function formatLine(label: string, a: string, b: string): string {
  return `${label.padEnd(6, '　')} \`${a}\`　vs　\`${b}\``;
}

function statLines(a: CompareStat, b: CompareStat): string {
  const wr = (s: CompareStat) => (s.games > 0 ? `${((s.wins / s.games) * 100).toFixed(1)}%` : '-');
  const kda = (s: CompareStat) =>
    s.games > 0 ? ((s.kills + s.assists) / Math.max(s.deaths, 1)).toFixed(2) : '-';
  const avgDmg = (s: CompareStat) =>
    s.games > 0 ? Math.round(s.totalDamage / s.games).toLocaleString() : '-';
  const avgGold = (s: CompareStat) =>
    s.games > 0 ? Math.round(s.totalGold / s.games).toLocaleString() : '-';
  const avgVision = (s: CompareStat) =>
    s.games > 0 ? (s.totalVisionScore / s.games).toFixed(1) : '-';

  return [
    formatLine('판수', `${a.games}판`, `${b.games}판`),
    formatLine('승률', wr(a), wr(b)),
    formatLine('KDA', kda(a), kda(b)),
    formatLine('평균딜', avgDmg(a), avgDmg(b)),
    formatLine('평균골드', avgGold(a), avgGold(b)),
    formatLine('평균시야', avgVision(a), avgVision(b)),
  ].join('\n');
}

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const user1: User = interaction.options.getUser('유저1', true);
  const user2: User = interaction.options.getUser('유저2', true);

  if (user1.id === user2.id) {
    await interaction.editReply('❌ 같은 사람을 두 번 지정할 수 없습니다.');
    return;
  }

  const filterResult = readFilterOptions(interaction);
  if (!filterResult.ok) {
    await interaction.editReply(filterResult.error);
    return;
  }

  const guildServerId = BigInt(interaction.guildId!);

  const [stat1, stat2] = await Promise.all([
    getComparisonStat(guildServerId, BigInt(user1.id), filterResult.opts),
    getComparisonStat(guildServerId, BigInt(user2.id), filterResult.opts),
  ]);

  if (!stat1 || !stat2) {
    const missing = !stat1 ? user1.displayName : user2.displayName;
    await interaction.editReply(
      `❌ **${missing}** 님은 이 서버에 등록된 라이엇 계정이 없습니다. \`/계정등록\`이 먼저 필요합니다.`,
    );
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(`⚔️ ${user1.displayName} vs ${user2.displayName}`)
    .setDescription(statLines(stat1, stat2))
    .setColor(0x5865f2)
    .setFooter({ text: '서버 등록 계정 기준' })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
