import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('도움말')
  .setDescription('룰루봇 커맨드 목록과 시작 방법을 안내합니다.');

export async function execute(interaction: ChatInputCommandInteraction) {
  const embed = new EmbedBuilder()
    .setTitle('📖 룰루봇 커맨드 안내')
    .setColor(0x5865f2)
    .setDescription(
      '**시작하기**\n' +
        '1️⃣ `/계정등록 닉네임#태그` 로 본인의 라이엇 계정을 연결하세요.\n' +
        '2️⃣ 등록 직후 자동으로 전적 갱신이 시작돼요 (매치가 많으면 시간이 좀 걸릴 수 있어요).\n' +
        '3️⃣ 완료되면 `/유저전적`, `/랭킹` 등으로 바로 확인할 수 있어요.',
    )
    .addFields(
      {
        name: '👤 계정 관리',
        value: [
          '`/계정등록` — 본인의 라이엇 계정 연결',
          '`/멤버등록` — 다른 멤버의 계정 대신 등록',
          '`/유저계정정보` — 연결된 계정 확인',
          '`/계정삭제` — 계정 연결 해제',
        ].join('\n'),
      },
      {
        name: '📊 전적 조회',
        value: [
          '`/전적갱신` — 커스텀 게임 기록 갱신',
          '`/유저전적` — 서버 내 전적 조회',
          '`/유저전체전적` — 서버 구분 없는 전체 커리어',
          '`/최근경기` — 최근 내전 결과',
          '`/모스트챔피언` — 모스트 챔피언 조회',
        ].join('\n'),
      },
      {
        name: '🏆 랭킹',
        value: [
          '`/랭킹` — 서버 종합 랭킹 (서버 기반)',
          '`/종합랭킹` — 전체 게임 기준 종합 랭킹',
          '`/챔피언랭킹` — 챔피언별 랭킹',
          '`/라인랭킹` — 라인별 특화 스탯 랭킹',
          '`/밴픽률` — 챔피언 밴픽률 순위',
        ].join('\n'),
      },
      {
        name: '🤝 비교/대결',
        value: ['`/듀오전적` — 듀오(같이 플레이) 전적', '`/전적비교` — 두 유저 전적 비교'].join(
          '\n',
        ),
      },
      {
        name: '🎖️ 칭호',
        value: ['`/칭호` — 서버 칭호 보유자 목록', '`/칭호순위` — 특정 칭호 전체 순위'].join('\n'),
      },
      {
        name: '🎲 기타',
        value: ['`/진영선택` — 블루/레드 진영 랜덤 결정'].join('\n'),
      },
      {
        name: '🛠️ 관리자 전용',
        value: [
          '`/전체갱신` — 서버 전체 멤버 전적 일괄 갱신',
          '`/계정삭제` (다른 유저 대상) — 관리자만 가능',
        ].join('\n'),
      },
    )
    .setFooter({ text: '"서버 기반"은 이 서버에 등록된 멤버들끼리 한 내전만 집계합니다.' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
