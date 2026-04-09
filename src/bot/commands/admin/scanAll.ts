import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { scanMatchesByUser, isScanningUser } from '../../../services/matchScan';
import { recalculateTitles } from '../../../services/titleService';
import prisma from '../../../lib/prisma';

export const data = new SlashCommandBuilder()
  .setName('전체갱신')
  .setDescription('서버 전체 멤버의 전적을 순차적으로 갱신합니다. (관리자 전용)');

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.memberPermissions?.has('Administrator')) {
    await interaction.reply({
      content: '❌ 관리자만 사용할 수 있는 명령어입니다.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply();

  const guildServerId = BigInt(interaction.guildId!);

  // 봇에 계정 등록된 모든 유저 조회
  // (데이터 초기화 후 UserGuildServer가 비어 있어도 동작하도록 DB 전체 기준)
  const users = await prisma.user.findMany({
    where: {
      discordUserId: { not: null },
      lolAccounts: { some: {} },
    },
    select: { discordUserId: true, lolAccounts: { select: { gameName: true, tagLine: true } } },
  });

  if (users.length === 0) {
    await interaction.editReply('등록된 멤버가 없습니다. `/계정등록` 먼저 진행해주세요.');
    return;
  }

  const notice = await interaction.editReply(
    `🔍 총 **${users.length}**명 순차 갱신 시작... (0/${users.length})`,
  );

  let done = 0;
  let totalSaved = 0;
  const failed: string[] = [];

  for (const user of users) {
    const discordUserId = user.discordUserId!;
    const accountLabel = user.lolAccounts.map((a) => `${a.gameName}#${a.tagLine}`).join(', ');

    // 이미 스캔 중인 유저는 스킵
    if (await isScanningUser(discordUserId)) {
      failed.push(`${accountLabel} (스캔 중)`);
      done++;
      continue;
    }

    try {
      const result = await scanMatchesByUser(discordUserId, guildServerId);
      totalSaved += result.saved;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '알 수 없는 오류';
      console.error(`[scanAll] ${accountLabel} 실패:`, err);
      failed.push(`${accountLabel} (${msg})`);
    }

    done++;
    await notice.edit(
      `🔍 총 **${users.length}**명 순차 갱신 중... (${done}/${users.length})\n> 현재: ${accountLabel}`,
    ).catch(() => {});
  }

  // 칭호 재계산
  try {
    await recalculateTitles(guildServerId);
  } catch (e) {
    console.error('[scanAll] 칭호 재계산 실패:', e);
  }

  const lines = [
    `✅ 전체 갱신 완료!`,
    ``,
    `> 갱신 인원: **${users.length}**명`,
    `> 새로 저장된 경기: **${totalSaved}**경기`,
  ];

  if (failed.length > 0) {
    lines.push(`> ⚠️ 실패: ${failed.join(', ')}`);
  }

  await notice.edit(lines.join('\n'));
}
