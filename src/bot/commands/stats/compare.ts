import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder, User } from 'discord.js';
import {
  getComparisonStat,
  getHeadToHead,
  CompareStat,
  HeadToHeadStat,
} from '../../../services/stats';

export const data = new SlashCommandBuilder()
  .setName('전적비교')
  .setDescription('두 유저의 전적을 나란히 비교합니다. (서버 기반)')
  .addUserOption((option) =>
    option.setName('유저1').setDescription('첫 번째 유저').setRequired(true),
  )
  .addUserOption((option) =>
    option.setName('유저2').setDescription('두 번째 유저').setRequired(true),
  );

function formatLine(label: string, a: string, b: string): string {
  return `${label.padEnd(6, '　')} \`${a}\`　vs　\`${b}\``;
}

function statLines(a: CompareStat, b: CompareStat): string {
  const wr = (s: CompareStat) => (s.games > 0 ? `${((s.wins / s.games) * 100).toFixed(1)}%` : '-');
  const kda = (s: CompareStat) =>
    s.games > 0 ? ((s.kills + s.assists) / Math.max(s.deaths, 1)).toFixed(2) : '-';
  const avg = (total: number, s: CompareStat) => (s.games > 0 ? total / s.games : 0);
  const avgDmg = (s: CompareStat) =>
    s.games > 0 ? Math.round(avg(s.totalDamage, s)).toLocaleString() : '-';
  const avgTaken = (s: CompareStat) =>
    s.games > 0 ? Math.round(avg(s.totalDamageTaken, s)).toLocaleString() : '-';
  const avgGold = (s: CompareStat) =>
    s.games > 0 ? Math.round(avg(s.totalGold, s)).toLocaleString() : '-';
  const avgCs = (s: CompareStat) => (s.games > 0 ? avg(s.totalCs, s).toFixed(1) : '-');
  const avgVision = (s: CompareStat) => (s.games > 0 ? avg(s.totalVisionScore, s).toFixed(1) : '-');
  const avgWards = (s: CompareStat) => (s.games > 0 ? avg(s.totalWardsPlaced, s).toFixed(1) : '-');
  const avgControlWards = (s: CompareStat) =>
    s.games > 0 ? avg(s.totalControlWardsPlaced, s).toFixed(1) : '-';
  const avgKp = (s: CompareStat) =>
    s.games > 0 ? `${(avg(s.totalKillParticipation, s) * 100).toFixed(0)}%` : '-';
  const avgTurrets = (s: CompareStat) =>
    s.games > 0 ? avg(s.totalTurretKills, s).toFixed(1) : '-';

  return [
    formatLine('판수', `${a.games}판`, `${b.games}판`),
    formatLine('승률', wr(a), wr(b)),
    formatLine('KDA', kda(a), kda(b)),
    formatLine('평균딜', avgDmg(a), avgDmg(b)),
    formatLine('평균받피', avgTaken(a), avgTaken(b)),
    formatLine('평균골드', avgGold(a), avgGold(b)),
    formatLine('평균CS', avgCs(a), avgCs(b)),
    formatLine('평균시야', avgVision(a), avgVision(b)),
    formatLine('평균와드', avgWards(a), avgWards(b)),
    formatLine('평균제어와드', avgControlWards(a), avgControlWards(b)),
    formatLine('킬관여', avgKp(a), avgKp(b)),
    formatLine('평균포탑', avgTurrets(a), avgTurrets(b)),
    formatLine('솔로킬', `${a.totalSoloKills}회`, `${b.totalSoloKills}회`),
    formatLine('펜타킬', `${a.totalPentaKills}회`, `${b.totalPentaKills}회`),
  ].join('\n');
}

function headToHeadText(name1: string, name2: string, h2h: HeadToHeadStat): string {
  if (h2h.sameTeamGames === 0 && h2h.againstGames === 0) {
    return '같이 내전한 기록이 없습니다.';
  }

  const lines: string[] = [];

  if (h2h.sameTeamGames > 0) {
    const losses = h2h.sameTeamGames - h2h.sameTeamWins;
    const wr = ((h2h.sameTeamWins / h2h.sameTeamGames) * 100).toFixed(1);
    lines.push(`같은팀(${h2h.sameTeamGames}전): ${h2h.sameTeamWins}승 ${losses}패 (${wr}%)`);
  }

  if (h2h.againstGames > 0) {
    const [leftName, leftWins, rightName, rightWins] =
      h2h.user1Wins >= h2h.user2Wins
        ? [name1, h2h.user1Wins, name2, h2h.user2Wins]
        : [name2, h2h.user2Wins, name1, h2h.user1Wins];
    const crown = leftWins > rightWins ? '👑 ' : '';
    const wr = ((leftWins / h2h.againstGames) * 100).toFixed(1);
    lines.push(
      `상대팀(${h2h.againstGames}전): ${crown}${leftName} ${leftWins}승 · ${rightName} ${rightWins}승 (${wr}%)`,
    );
  }

  return lines.join('\n');
}

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const user1: User = interaction.options.getUser('유저1', true);
  const user2: User = interaction.options.getUser('유저2', true);

  if (user1.id === user2.id) {
    await interaction.editReply('❌ 같은 사람을 두 번 지정할 수 없습니다.');
    return;
  }

  const guildServerId = BigInt(interaction.guildId!);

  const [stat1, stat2, h2h] = await Promise.all([
    getComparisonStat(guildServerId, BigInt(user1.id), { serverOnly: true }),
    getComparisonStat(guildServerId, BigInt(user2.id), { serverOnly: true }),
    getHeadToHead(guildServerId, BigInt(user1.id), BigInt(user2.id), { serverOnly: true }),
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
    .setColor(0x5865f2)
    .addFields(
      { name: '📊 개인 전적', value: statLines(stat1, stat2) },
      {
        name: '🤝 상대전적',
        value: headToHeadText(user1.displayName, user2.displayName, h2h),
      },
    )
    .setFooter({ text: '서버 기반 (참가자 8명 이상 매치만 포함)' })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
