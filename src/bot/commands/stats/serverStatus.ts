import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import {
  getServerOnlyReadiness,
  SERVER_ONLY_MIN_PARTICIPANTS,
} from '../../../services/serverReadiness';

export const data = new SlashCommandBuilder()
  .setName('서버현황')
  .setDescription('이 서버의 등록 인원과 서버기반 기능 사용 가능 여부를 확인합니다.');

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const guildServerId = interaction.guildId ? BigInt(interaction.guildId) : null;
  if (!guildServerId) {
    await interaction.editReply('서버 전용 커맨드입니다.');
    return;
  }

  const { ready, registeredCount } = await getServerOnlyReadiness(guildServerId);

  const statusLine = ready
    ? `✅ 사용 가능 (등록 ${registeredCount}명 · 기준 ${SERVER_ONLY_MIN_PARTICIPANTS}명)`
    : `⏳ 아직 사용 불가 — ${SERVER_ONLY_MIN_PARTICIPANTS - registeredCount}명 더 등록되면 켜짐 (등록 ${registeredCount}/${SERVER_ONLY_MIN_PARTICIPANTS}명)`;

  const embed = new EmbedBuilder()
    .setTitle('📊 서버 현황')
    .setColor(ready ? 0x57f287 : 0xfaa61a)
    .addFields(
      { name: '등록된 유저', value: `${registeredCount}명`, inline: true },
      {
        name: '서버기반 기능 (/랭킹·/칭호 등)',
        value: statusLine,
        inline: false,
      },
    )
    .setFooter({
      text: '매치 참가자 중 이 서버 등록 유저가 8명 이상이어야 서버기반 매치로 집계됩니다.',
    })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
