import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { TITLE_DEFINITIONS } from '../../../services/titleService';
import prisma from '../../../lib/prisma';

export const data = new SlashCommandBuilder()
  .setName('칭호')
  .setDescription('이 서버의 칭호 보유자 목록을 조회합니다.');

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const guildServerId = BigInt(interaction.guildId!);

  const userTitles = await prisma.userTitle.findMany({
    where: { guildServerId },
    include: { lolAccount: { include: { user: true } } },
  });

  if (userTitles.length === 0) {
    await interaction.editReply(
      '아직 칭호 데이터가 없습니다. `/전적갱신` 을 먼저 실행해주세요.',
    );
    return;
  }

  // 카테고리별로 묶어서 출력
  const categories: { name: string; codes: string[] }[] = [
    { name: '⚔️ 전투', codes: ['학살자', '생존왕', '킹메이커', '퍼블전문가', '펜타킬러', '쿼드라킬러'] },
    { name: '💢 딜/탱', codes: ['DPM머신', '샌드백', '철거왕'] },
    { name: '🐉 오브젝트', codes: ['용사냥꾼', '바론사냥꾼'] },
    { name: '🌾 CS/경제', codes: ['CS왕', '골드킹'] },
    { name: '👁️ 시야', codes: ['만물의눈', '와드장인', '청소부', '타임스토프'] },
    { name: '🎲 기타', codes: ['투명인간', '플레이메이커', '솔로킹', '흑백모니터', '모범승객', '불사신', '개근상', '연승왕', '연패왕', '끈기왕', '속전속결', '신인왕'] },
    { name: '🏔️ 탑', codes: ['TOPKING', '전사왕', '고기방패', '고속도로건설자', '라인전의악마'] },
    { name: '🌲 정글', codes: ['JUGKING', '포식자', '오브젝트마스터', '작전명왕호야', '대도둑'] },
    { name: '🔮 미드', codes: ['MIDKING', '황족', '미드DPM', '로밍킹', '미드솔로킬러'] },
    { name: '🏹 원딜', codes: ['ADKING', '해결사', '금수저', '평타싸개', '존윅'] },
    { name: '💊 서폿', codes: ['SUPKING', '그림자', '와드싸개', '경호원', '베이비시터'] },
  ];

  const titleMap = new Map(userTitles.map((t) => [t.titleCode, t]));

  const embed = new EmbedBuilder()
    .setTitle('🏅 서버 칭호 보유자')
    .setColor(0x5865f2)
    .setTimestamp()
    .setFooter({ text: '/전적갱신 시 재계산 · 서버당 각 칭호는 1명만 보유' });

  for (const category of categories) {
    const lines: string[] = [];

    for (const code of category.codes) {
      const holders = userTitles.filter((t) => t.titleCode === code);
      const def = TITLE_DEFINITIONS[code];
      if (!def) continue;

      if (holders.length === 0) {
        lines.push(`${def.icon} **${def.name}** — *없음*`);
        continue;
      }

      // 보유자 이름 목록 (동점이면 여러 명)
      const holderNames = await Promise.all(
        holders.map(async (title) => {
          const acc = title.lolAccount;
          const accountStr = `${acc.gameName}#${acc.tagLine}`;
          if (acc.user?.discordUserId) {
            try {
              const member = await interaction.guild!.members.fetch(
                acc.user.discordUserId.toString(),
              );
              return `${member.displayName} (${accountStr})`;
            } catch {}
          }
          return accountStr;
        }),
      );

      const holderStr = holderNames.join(', ');
      lines.push(`${def.icon} **${def.name}** — ${holderStr}`);
    }

    if (lines.length > 0) {
      embed.addFields({ name: category.name, value: lines.join('\n'), inline: false });
    }
  }

  await interaction.editReply({ embeds: [embed] });
}
