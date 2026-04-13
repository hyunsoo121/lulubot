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
**증상**: `docker-compose up` 시 포트 이미 사용 중 오류  
**원인**: 기존에 실행 중인 `matchday-postgres`, `matchday-redis` 컨테이너가 같은 포트 점유  
**해결**: `docker stop matchday-postgres matchday-redis`

---

### Prisma 7 Breaking Change
**증상**: `PrismaClient` 생성 시 `adapter` 필수 오류  
**원인**: Prisma 7에서 `adapter` 옵션이 필수로 변경됨  
**해결**: Prisma 5로 다운그레이드, `prisma.config.ts` 삭제, schema에 `provider: "prisma-client-js"` 명시

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
**원인**: `deferReply()` 이후엔 공개/비공개 여부가 이미 결정됨 — `editReply`는 flags 변경 불가  
**해결**: `deferReply({ flags: MessageFlags.Ephemeral })` 단계에서 지정, `editReply`는 문자열만 전달

---

### `SlashCommandOptionsOnlyBuilder` 타입 오류
**증상**: `addStringOption` 등 체인 후 타입 불일치  
**원인**: 옵션 추가 후 반환 타입이 `SlashCommandOptionsOnlyBuilder`로 좁혀짐  
**해결**: `Command.data` 타입을 `SlashCommandBuilder | SlashCommandOptionsOnlyBuilder` 유니온으로 변경

---

### DiscordAPIError[10062]: Unknown interaction
**증상**: `deferReply()` 호출 시 Unknown interaction 오류 후 봇 크래시  
**원인**: Discord interaction은 3초 내 응답 필수. nodemon 재시작 전에 들어온 interaction을 재시작 후 처리 시 토큰 만료  
**해결**: `interactionCreate` 이벤트 핸들러의 catch 블록을 try-catch로 감싸 만료된 interaction 오류 무시

---

### `deploy:commands` 프로세스 미종료
**증상**: 커맨드 등록 후 프로세스가 종료되지 않고 hanging  
**해결**: `process.exit(0)` 추가

---

### 이전 봇의 커맨드가 남아있음
**증상**: 새 봇에서 `/`를 누르면 구버전 커맨드가 표시됨  
**원인**: 이전 봇이 길드 커맨드로 등록 — 글로벌 커맨드 덮어쓰기와 무관하게 유지됨  
**해결**: `npm run clear:guild-commands` 실행 (`.env`에 `DISCORD_GUILD_ID` 필요)

---

## Riot API

### `type=custom` 파라미터 미지원
**증상**: 커스텀 게임만 필터링하려 했으나 API 파라미터 오류  
**원인**: Riot Match v5 API는 `type=custom` 파라미터를 지원하지 않음  
**해결**: 파라미터 제거 후 매치 상세에서 `info.gameType === 'CUSTOM_GAME'` 조건으로 필터링

---

### `queue=0`으로 토너먼트 게임 미탐지
**증상**: `queue=0` 필터 적용 시 토너먼트 코드 게임이 하나도 조회되지 않음  
**원인**: 토너먼트 코드 게임의 실제 queueId는 `0`이 아닌 `3130`임  
**확인**: `debugQueue.ts` 스크립트로 직접 확인
```
KR_8115970364 → gameType: CUSTOM_GAME, gameMode: CLASSIC, queueId: 3130
```
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

### `getMvpPuuid` reduce 빈 배열 오류
**증상**: `TypeError: Reduce of empty array with no initial value`  
**원인**: 비정상 종료된 매치의 경우 `win === true`인 참가자가 없을 수 있음  
**해결**: 승리팀이 없으면 전체 참가자 중 딜 1위를 MVP로 처리

---

## 전적 스캔 로직

### 랭킹에 유저가 안 뜨는 문제 (UserGuildServer 누락)
**증상**: `/등록` 완료 후 `/랭킹`에 본인이 표시되지 않음  
**원인**: 이미 등록된 계정 재등록 시 "이미 등록된 계정입니다" 에러 경로에서 `UserGuildServer` upsert 코드에 도달하지 못함  
**해결**: `account.ts`에서 이미 등록된 계정이라도 `UserGuildServer` upsert 후 에러 throw

---

### `/데이터초기화` 후 재갱신 시 전적 미복구
**증상**: 초기화 후 `/전적갱신` 해도 전적이 0으로 남음  
**원인**: `MatchRecord`가 `guildServerId: null`로 저장되어 있어 서버 기준 초기화 쿼리에서 누락 → `PlayerMatchStat`은 삭제됐지만 `MatchRecord`는 남아있음 → 재스캔 시 `MatchRecord` 존재 확인 → 스킵  
**해결**:
1. `reset.ts`: `guildServerId` 기준이 아닌 `lolAccountId` 기준으로 `PlayerMatchStat` 삭제
2. `saveMatch`: `MatchRecord.create` → `upsert`로 변경, 해당 계정의 `PlayerMatchStat`이 없으면 삽입

---

### 스캔 중 서버 종료 시 부분 저장 문제
**증상**: 스캔 도중 서버 종료 후 재시작하면 일부 매치만 저장된 채 증분 스캔으로 처리되어 오래된 매치 누락  
**원인**: Riot API는 최신순으로 매치 ID를 반환 → 최신 매치부터 저장 → 중단 시 오래된 매치 미저장 → 다음 증분 스캔은 최신 저장 매치 이후만 조회  
**해결**: 봇 재시작 시 진행 중이던 스캔 락을 감지 → 해당 유저의 `PlayerMatchStat` / `UserGlobalStat` 삭제 → 다음 갱신 시 전체 재스캔

---

### 스캔 락 stuck 문제
**증상**: `/전적갱신` 실행 시 "이미 갱신이 진행 중입니다" 메시지가 계속 뜸  
**원인**: nodemon 파일 변경 감지로 봇 재시작 시 Redis 스캔 락이 삭제되지 않고 남아있음  
**해결**: `ready` 이벤트에서 `clearAllScanLocks()` 호출하여 봇 시작 시 자동 초기화

---

### 여러 계정 보유 유저 랭킹 중복 표시
**증상**: 같은 유저가 계정 수만큼 랭킹에 중복 표시됨  
**원인**: `getServerRanking`이 `LolAccount` 단위로 엔트리를 생성  
**해결**: `User` 단위로 집계하고 여러 계정 통계를 합산, Discord 멤버 표시 이름으로 출력

---

## 기타

### 6개월 스캔 제한 → 전체 기간으로 변경
**배경**: Rate Limit 문제로 첫 스캔 범위를 6개월로 제한했으나, `queue=3130` 필터 적용 후 토너먼트 게임만 가져오므로 API 호출 수가 적어짐  
**결정**: 제한 제거, 전체 기간 스캔으로 복원
