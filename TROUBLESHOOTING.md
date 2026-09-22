# Troubleshooting

개발 중 발생한 문제와 해결 과정을 기록합니다.

---

## 환경 설정

### ESLint v10 flat config 마이그레이션
**증상**: `eslint src --ext .ts` 실행 시 오류  
**원인**: ESLint v10은 `.eslintrc.json` 대신 `eslint.config.js` flat config 방식만 지원  
**해결**: `eslint.config.js` 생성, `typescript-eslint` 패키지 추가

---

### Docker 포트 충돌
**증상**: `docker compose up` 시 포트 이미 사용 중 오류  
**원인**: 기존에 실행 중인 다른 컨테이너가 같은 포트 점유  
**해결**: `docker ps`로 점유 컨테이너 확인 후 `docker stop <container>`

---

### Prisma 7 Breaking Change
**증상**: `PrismaClient` 생성 시 `adapter` 필수 오류  
**원인**: Prisma 7에서 `adapter` 옵션이 필수로 변경됨  
**해결**: Prisma 5로 다운그레이드, `prisma.config.ts` 삭제, schema에 `provider: "prisma-client-js"` 명시

---

### `prisma migrate dev` 데이터 리셋
**증상**: 컬럼 추가 후 `prisma migrate dev` 실행 시 기존 데이터 전체 삭제  
**원인**: `migrate dev`는 shadow DB를 사용하며, 마이그레이션 충돌 시 테이블을 재생성할 수 있음  
**해결**: 컬럼 추가 시 `prisma db push` 사용 (데이터 유지, 스키마만 반영)

---

### tsconfig `lib` / `types` 누락
**증상**: `ts-node` 실행 시 `Promise`, `process` 등 타입 미인식  
**원인**: `tsconfig.json`에 `lib`, `types` 미설정  
**해결**: `"lib": ["ES2022", "DOM"]`, `"types": ["node"]` 추가

---

## Discord.js

### `ephemeral: true` deprecated
**증상**: 빌드 경고  
**원인**: discord.js 14에서 `ephemeral` 옵션 deprecated  
**해결**: `flags: MessageFlags.Ephemeral` 로 변경

---

### `editReply`에 `MessageFlags.Ephemeral` 불가
**증상**: `deferReply()` 후 `editReply`에 flags 전달 시 오류  
**원인**: `deferReply()` 이후엔 공개/비공개 여부가 이미 결정됨  
**해결**: `deferReply({ flags: MessageFlags.Ephemeral })` 단계에서 지정

---

### `SlashCommandSubcommandsOnlyBuilder` 타입 오류
**증상**: `addSubcommand()` 사용 커맨드 등록 시 타입 불일치  
**원인**: 서브커맨드 사용 시 반환 타입이 `SlashCommandSubcommandsOnlyBuilder`로 좁혀짐  
**해결**: `Command.data` 타입에 `SlashCommandSubcommandsOnlyBuilder` 유니온 추가

---

### DiscordAPIError[10062]: Unknown interaction
**증상**: `deferReply()` 호출 시 Unknown interaction 오류  
**원인**: Discord interaction은 3초 내 응답 필수. nodemon 재시작 전 들어온 interaction을 재시작 후 처리 시 토큰 만료  
**해결**: `interactionCreate` 핸들러의 catch 블록에서 만료된 interaction 오류 무시

---

### autocomplete choices 25개 한계
**증상**: 칭호가 25개 초과라 `addChoices`로 등록 불가  
**원인**: Discord API는 choices를 최대 25개로 제한  
**해결**: `isAutocomplete()` 인터랙션 방식으로 전환 — 입력값 기준으로 동적 필터링 후 응답

---

### `deploy:commands` 프로세스 미종료
**증상**: 커맨드 등록 후 프로세스가 종료되지 않고 hanging  
**해결**: `process.exit(0)` 추가

---

### 이전 봇의 커맨드가 남아있음
**증상**: 새 봇에서 `/`를 누르면 구버전 커맨드가 표시됨  
**원인**: 이전 봇이 길드 커맨드로 등록 — 글로벌 커맨드 덮어쓰기와 무관하게 유지됨  
**해결**: `npm run clear:guild-commands` 실행

---

### 페이지네이션 버튼 클릭마다 Discord API/DB 재조회
**증상**: `/랭킹`, `/종합랭킹`, `/칭호`처럼 페이지가 여러 장인 랭킹 커맨드에서, 페이지 이전/다음 버튼을 누를 때마다 멤버 표시 이름을 다시 조회함 — 인원이 많은 서버일수록 버튼 클릭 한 번에 최대 10건의 `guild.members.fetch()`가 매번 새로 나감  
**원인**: 표시 행을 만드는 함수가 "그 페이지에 해당하는 항목만" async하게 매번 계산하도록 짜여 있어서, 초기 렌더 + 버튼 클릭마다 매번 호출됨. `championRanking.ts`/`laneRanking.ts`/`titleRanking.ts`는 처음부터 전체를 한 번만 계산해두는 방식이라 이 문제가 없었음  
**해결**: `ranking.ts`, `overallRanking.ts`, `titles.ts`를 같은 방식으로 통일 — 커맨드 실행 시 전체 목록(모든 페이지)의 표시 행을 한 번에 전부 계산해서 배열/Map에 담아두고, 페이지 이전/다음은 그 배열을 `slice()`(또는 Map 조회)만 하도록 변경. **등록 인원 30명(3페이지) 기준으로 계산하면, 기존엔 페이지를 3번 왕복(6번 클릭)할 때마다 최대 10×6=60건의 `guild.members.fetch()`가 나갔는데, 수정 후엔 커맨드 실행 시 최대 30건(전체 인원 수만큼) 1회로 끝나고 이후 클릭은 0건.** `titles.ts`는 같은 유저가 칭호를 여러 개 들고 있어도(예: 57개 칭호 중 10개를 한 사람이 독점) fetch를 유저당 1번으로 중복 제거해서 추가로 줄임  
**참고**: 여러 멤버를 한 번의 요청으로 가져오는 `guild.members.fetch({ user: [...] })`(배치 fetch)는 REST가 아니라 게이트웨이 방식이라 `GuildMembers` 특권 인텐트가 필요한데, 이 봇은 `GatewayIntentBits.Guilds`만 켜져 있어 사용 불가 — 인텐트 없이 시도하면 120초 타임아웃 후 에러남. 그래서 이번엔 "호출 횟수를 1번으로 줄이는" 선에서 해결했고, "요청 자체를 배치로 묶기"는 인텐트 추가가 필요한 별도 작업으로 남겨둠

---

## Riot API

### `type=custom` 파라미터 미지원
**증상**: 커스텀 게임만 필터링하려 했으나 API 파라미터 오류  
**원인**: Riot Match v5 API는 `type=custom` 파라미터를 지원하지 않음  
**해결**: 파라미터 제거 후 매치 상세에서 `info.gameType === 'CUSTOM_GAME'` 조건으로 필터링

---

### `queue=0`으로 커스텀 게임 미탐지
**증상**: `queue=0` 필터 적용 시 커스텀 게임이 하나도 조회되지 않음  
**원인**: 커스텀 게임의 실제 queueId는 `0`이 아닌 `3130`  
**해결**: `queue: 3130` 으로 변경

---

### Rate Limit (429) 오류
**증상**: 전적 갱신 중 `Request failed with status code 429`  
**원인**: Development API Key 제한 (초당 20req, 2분 100req)  
**해결**:
- 매치 상세 조회 사이 `sleep(1200ms)` 적용
- `Retry-After` 헤더 읽어서 해당 시간만큼 대기 후 자동 재시도 (최대 5회)
- `queue=3130` 필터로 불필요한 매치 조회 자체를 줄임

---

## 전적 스캔 로직

### 랭킹에 유저가 안 뜨는 문제 (UserGuildServer 누락)
**증상**: `/계정등록` 완료 후 `/랭킹`에 본인이 표시되지 않음  
**원인**: 이미 등록된 계정 재등록 시 에러 경로에서 `UserGuildServer` upsert에 도달하지 못함  
**해결**: 이미 등록된 계정이라도 `UserGuildServer` upsert 후 에러 throw

---

### `/데이터초기화` 후 재갱신 시 전적 미복구
**증상**: 초기화 후 `/전적갱신` 해도 전적이 0으로 남음  
**원인**: `MatchRecord`가 `guildServerId: null`로 저장되어 있어 서버 기준 초기화 쿼리에서 누락 → `PlayerMatchStat`은 삭제됐지만 `MatchRecord`는 남아있음 → 재스캔 시 스킵  
**해결**:
- `reset.ts`: `lolAccountId` 기준으로 `PlayerMatchStat` 삭제
- `saveMatch`: `MatchRecord.create` → `upsert`로 변경, 해당 계정의 `PlayerMatchStat`이 없으면 삽입

---

### 스캔 중 서버 종료 시 부분 저장 문제
**증상**: 스캔 도중 서버 종료 후 재시작하면 일부 매치만 저장된 채 증분 스캔으로 처리되어 오래된 매치 누락  
**원인**: Riot API는 최신순으로 매치 ID 반환 → 최신 매치부터 저장 → 중단 시 오래된 매치 미저장  
**해결**: 봇 재시작 시 진행 중이던 스캔 락 감지 → 해당 유저의 `PlayerMatchStat` / `UserGlobalStat` 삭제 → 다음 갱신 시 전체 재스캔

---

### 스캔 락 stuck 문제
**증상**: `/전적갱신` 실행 시 "이미 갱신이 진행 중입니다" 메시지가 계속 뜸  
**원인**: nodemon 재시작 시 Redis 스캔 락이 삭제되지 않고 남아있음  
**해결**: `ready` 이벤트에서 `clearAllScanLocks()` 호출하여 봇 시작 시 자동 초기화

---

### 여러 계정 보유 유저 랭킹 중복 표시
**증상**: 같은 유저가 계정 수만큼 랭킹에 중복 표시됨  
**원인**: `LolAccount` 단위로 랭킹 엔트리 생성  
**해결**: `User` 단위로 집계하고 여러 계정 통계 합산

---

## 칭호 시스템

### Prisma groupBy로 분당 계산 불가
**증상**: 칭호를 분당(per-minute) 기준으로 계산하려 했으나 groupBy와 game duration을 함께 집계하기 어려움  
**원인**: Prisma groupBy는 집계 함수(sum, avg 등)만 지원하며 조인된 테이블의 필드를 함께 sum하기 어려움  
**해결**: `findMany`로 `matchRecord.gameDurationSecs` 포함 조회 후 Map으로 직접 누적 집계하는 `aggregatePerMin` 함수 작성

---

### MVP 시스템 제거 후 isMvp 컬럼 마이그레이션
**증상**: `PlayerMatchStat`에서 `isMvp` 컬럼 제거 필요  
**해결**: `prisma db push`로 스키마 반영 (데이터 유지)

---

## 계정 등록

### 서버기반 랭킹 참가자 임계치가 인원 비례라 소규모 서버에서 판이 자주 사라짐
**증상**: 등록 인원이 2~4명인 서버에서 `/랭킹`, `/칭호` 등 서버기반 커맨드가 실제로 함께 내전한 판인데도 자꾸 "전적 없음"을 띄움. 원인을 알 수 없는 채로 `/전적갱신`을 반복 요청받음  
**원인**: `filterMatchIds`의 서버기반 임계치가 `min(8, ceil(등록유저수×0.8))`로 인원 수에 비례해서 계산됨 — 등록 인원이 2~4명이면 사실상 100% 전원 참여를 요구해, 친구 한 명만 빠져도 그 판 전체가 조용히 필터링됨. 게다가 인원이 들고날 때마다 과거 판의 인정 여부까지 같이 바뀌어 동작을 예측할 수 없었음  

| 등록 인원(N) | 이전: 매치당 필요 인원 | 이후: 매치당 필요 인원 |
|---|---|---|
| 2 | 2명 (100%) | 8명(고정) — 8명 미만이라 항상 불가, 대신 명확한 안내 표시 |
| 4 | 4명 (100%) | 8명(고정) — 동일 |
| 5 | 4명 (80%) | 8명(고정) — 동일 |
| 9 | 8명 (89%) | 8명(고정) — 사실상 동일 |
| 10 | 8명 (80%, 캡) | 8명(고정) — 동일 |
| 50 | 8명 (캡) | 8명(고정) — 동일 |

N≥9인 서버는 사실상 변화 없고, N<8인 서버는 "가끔 되다 안 되다" 하던 것에서 "8명 될 때까지는 항상 비활성 + 왜 비활성인지 안내"로 바뀜  
**해결**: 임계치를 인원 비례 계산 대신 **고정값 8명**으로 단순화(`matchFilter.ts`). 등록 인원이 8명 미만인 서버는 각 서버기반 커맨드 실행 시 "이 기능은 서버 등록 인원이 8명 이상일 때부터 사용할 수 있어요"라고 명확히 안내(`serverReadiness.ts`)하도록 변경 — 규칙이 서버 인원 수와 무관하게 항상 동일해서 예측 가능해짐

---

### 계정 등록 레이스 컨디션으로 계정 소유권 가로채기 가능
**증상**: 같은 라이엇 계정으로 두 명이 거의 동시에 `/계정등록`(또는 `/멤버등록`)을 실행하면, 나중에 처리되는 쪽이 조용히 먼저 등록한 사람의 계정 소유권을 가로챔. 둘 다 에러 없이 "등록 완료"를 받음  
**원인**: `registerAccount`가 "이미 등록됐는지 확인(`findUnique`)" → "무조건 덮어쓰기(`upsert`)" 순서로 동작해서, 확인과 쓰기 사이에 다른 요청이 끼어들 틈(TOCTOU)이 있었음. 확인 시점엔 아직 아무도 소유하지 않은 것처럼 보였어도, 쓰기 시점엔 이미 다른 유저가 선점했을 수 있는데 `upsert`는 조건 없이 그냥 덮어씀  
**해결**: 최종 쓰기를 DB의 원자성에 위임하도록 변경. 신규 puuid는 `create`로 시도하고, `puuid` 유니크 제약 충돌(P2002)이 나면 `updateMany({ where: { puuid, userId: null } })`로 "주인이 없을 때만" 조건부로 claim — 두 요청이 동시에 와도 Postgres가 그중 하나에만 `count: 1`을 보장하므로 승자가 명확히 갈림. `count: 0`이면 이미 다른 유저가 가져간 것이므로 에러로 명확히 거부. **이전엔 DB 쓰기 2번(확인용 조회 1번 + 무조건 덮어쓰기 1번) 사이에 레이스 구간이 있었는데, 이후엔 원자적 쓰기 1번(`create` 또는 조건부 `updateMany`)으로 그 구간 자체가 사라짐.** 레이스 6가지 시나리오(정상 경로 3개 + TOCTOU 레이스 4개)를 `src/services/account.test.ts`에 회귀 테스트 7건으로 남김

---

### `/전체갱신` 완료 메시지가 인터랙션 토큰 만료로 조용히 유실됨
**증상**: 등록 인원이 많은 서버에서 `/전체갱신`(관리자 전용, 전체 멤버 순차 스캔)을 돌리면, 실제로는 스캔이 다 끝났는데 관리자가 성공/실패 메시지를 아예 못 받음  
**원인**: Discord 인터랙션 토큰은 **최초 응답(`deferReply`) 후 15분(900초)**만 유효한데, 매치 1건 스캔마다 레이트리밋 페이싱으로 약 1.3초씩 걸림(`estimateScanMinutes`: `matchCount * 1.3 / 60`분) — 예를 들어 등록 인원 10명이 각자 매치 60건씩만 있어도(총 600건) 약 13분, 유저 사이 오버헤드까지 더하면 15분 한도에 쉽게 걸림. 마지막 완료 메시지 `notice.edit(...)`에 `.catch()`가 없어서, 토큰이 만료된 상태로 이 호출이 실패하면 그 에러가 `interactionCreate.ts`의 전역 catch까지 올라가는데, 거기서 시도하는 `followUp()`도 **똑같이 만료된 토큰**이라 역시 조용히 실패 — 결과적으로 실패 흔적이 서버 콘솔 로그에만 남고 관리자에게는 아무 메시지도 안 감  
**해결**: 완료 메시지 `edit`을 `try/catch`로 감싸고, 실패하면(토큰 만료 등) **같은 채널에 새 메시지로 폴백 전송**(`interaction.channel.send`) — 채널 메시지는 인터랙션 토큰과 무관해서 만료 이후에도 항상 보낼 수 있음. 그것마저 실패하면 콘솔 로그만 남기고 조용히 종료(`src/bot/commands/admin/scanAll.ts`)
