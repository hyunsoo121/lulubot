import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { getRecentMatchByDiscordId } from '../../../services/stats';

const POSITION_KR: Record<string, string> = {
  TOP: '탑',
  JUNGLE: '정글',
  MIDDLE: '미드',
  BOTTOM: '원딜',
  UTILITY: '서포터',
  UNKNOWN: '?',
};

export const data = new SlashCommandBuilder()
  .setName('최근경기')
  .setDescription('마지막 내전 결과를 조회합니다.')
  .addUserOption((option) => option.setName('유저').setDescription('조회할 유저 (미입력 시 본인)'));

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const target = interaction.options.getUser('유저') ?? interaction.user;
  const discordUserId = BigInt(target.id);
  const stat = await getRecentMatchByDiscordId(discordUserId);

  if (!stat) {
    await interaction.editReply(
      target.id === interaction.user.id
        ? '전적 데이터가 없습니다. `/등록` 후 `/전적갱신` 을 해주세요.'
        : `${target.displayName} 님의 전적 데이터가 없습니다.`,
    );
    return;
  }

  const { matchRecord } = stat;
  const isWin = stat.isWin;
  const kda = stat.deaths > 0 ? ((stat.kills + stat.assists) / stat.deaths).toFixed(2) : 'Perfect';

  // 팀 구성 (BLUE / RED 분리)
  const blueTeam = matchRecord.playerStats.filter((p) => p.team === 'BLUE');
  const redTeam = matchRecord.playerStats.filter((p) => p.team === 'RED');

  function formatTeam(players: typeof blueTeam) {
    return players
      .map((p) => {
        const pos = POSITION_KR[p.position] ?? p.position;
        const name = p.lolAccount.gameName;
        const kd = `${p.kills}/${p.deaths}/${p.assists}`;
        const mvp = p.isMvp ? ' 👑' : '';
        return `${pos} **${name}** ${kd}${mvp}`;
      })
      .join('\n');
  }

  const duration = `${Math.floor(matchRecord.gameDurationSecs / 60)}분 ${matchRecord.gameDurationSecs % 60}초`;
  const playedAt = new Date(matchRecord.playedAt);

  const embed = new EmbedBuilder()
    .setTitle(
      `${isWin ? '✅ 승리' : '❌ 패배'} — ${stat.lolAccount.gameName}#${stat.lolAccount.tagLine}`,
    )
    .setColor(isWin ? 0x57f287 : 0xed4245)
    .setDescription(
      `**포지션:** ${POSITION_KR[stat.position] ?? stat.position}　**KDA:** ${stat.kills}/${stat.deaths}/${stat.assists} (${kda})　**CS:** ${stat.cs}`,
    )
    .addFields(
      {
        name: `🔵 블루팀 ${matchRecord.winnerTeam === 'BLUE' ? '(승)' : '(패)'}`,
        value: formatTeam(blueTeam) || '-',
        inline: true,
      },
      {
        name: `🔴 레드팀 ${matchRecord.winnerTeam === 'RED' ? '(승)' : '(패)'}`,
        value: formatTeam(redTeam) || '-',
        inline: true,
      },
    )
    .setFooter({ text: `게임 시간: ${duration}` })
    .setTimestamp(playedAt);

  await interaction.editReply({ embeds: [embed] });
}
