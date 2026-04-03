# lulubot

디스코드 안에서 완결되는 롤 내전 생태계.
토너먼트 코드 발급 → 게임 종료 시 자동 전적 수집 → 디스코드에서 통계 조회까지, 디스코드를 벗어나지 않고 모든 게 가능한 봇 서비스.

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| 언어 | TypeScript |
| 봇 | discord.js 14 |
| 웹서버 | Express 5 |
| ORM | Prisma 5 |
| DB | PostgreSQL |
| 캐시 | Redis (ioredis) |
| 배포 | Docker + AWS |

---

## 서비스 플로우

### 1단계 (현재 — 데모)
```
유저가 /등록 실행
  └─ Riot API로 PUUID 조회 → DB upsert
       └─ 백그라운드에서 전체 토너먼트 게임 스캔 (queue 3130)
            └─ 매치 저장 → 전적/랭킹 조회 가능

/전적갱신 실행
  └─ 마지막 저장 매치 이후 신규 토너먼트 게임만 증분 스캔
```

### 2단계 (예정)
```
/내전생성
  └─ 토너먼트 코드 발급 (Redis PENDING, TTL 30분)
       └─ 게임 종료 → Riot이 Express 서버로 matchId POST
            └─ Match API 호출 → DB 저장 → 참가자 매핑
                 └─ 결과 임베드 디스코드 채널 자동 출력
```

---

## 구현된 명령어

### 계정
| 명령어 | 설명 |
|--------|------|
| `/등록 닉네임#태그` | 라이엇 계정 연결 + 백그라운드 전체 스캔 |
| `/내정보` | 연결된 계정 확인 |
| `/멤버등록 @유저 닉네임#태그` | 다른 유저 대신 등록 |

### 전적
| 명령어 | 설명 |
|--------|------|
| `/전적갱신 [@멤버]` | 본인 또는 지정 멤버 전적 갱신 (3분 쿨다운) |
| `/전적 [@유저]` | 커스텀 게임 누적 통계 |
| `/전체전적 [@유저]` | 전 서버 합산 커리어 (모든 등록 계정 합산) |
| `/최근경기 [@유저]` | 마지막 내전 결과 상세 (블루/레드팀, MVP) |
| `/랭킹` | 서버 멤버 종합 랭킹 (승률 → KDA 순, 유저 단위 합산) |

### 관리자
| 명령어 | 설명 |
|--------|------|
| `/데이터초기화` | 서버 전적/통계 초기화 (테스트용, 관리자 전용) |

### 미구현 (예정)
| 명령어 | 설명 |
|--------|------|
| `/내전생성` | 토너먼트 코드 발급 (2단계) |
| `/라인랭킹` `/챔피언` `/듀오` `/라이벌` | 3단계 |
| `/업적` `/이달의기록` | 3단계 |

---

## 전적 스캔 구조

- **큐 필터**: `queue=3130` (토너먼트 코드 게임만 — 랭크/일반 제외)
- **증분 스캔**: 마지막 저장 매치 `playedAt` → Riot API `startTime` 파라미터
- **Rate Limit 대응**: 429 시 `Retry-After` 헤더 대기 후 자동 재시도 (최대 5회)
- **중단 복구**: 봇 재시작 시 중단된 스캔 감지 → 부분 저장 데이터 자동 초기화 → 다음 갱신 시 전체 재스캔
- **스캔 락**: Redis로 중복 스캔 방지 (TTL 30분)
- **쿨다운**: 3분에 1회 제한

---

## 개발 단계

- **1단계 (데모, 현재)** — 유저 등록, 토너먼트 게임 스캔, 전적/랭킹 조회, Production Key 심사 신청
- **2단계 (정식)** — 토너먼트 코드 발급, Riot 콜백 자동 수집, 결과 자동 출력
- **3단계 (확장)** — 업적 시스템, 듀오/라이벌, 칭호, 이달의기록

---

## 로컬 개발 환경

### 사전 준비

- Node.js 20+
- Docker & Docker Compose
- Riot Games API Key (Development 이상)
- Discord Bot Token + Client ID

### 설치

```bash
# 의존성 설치
npm install

# Git 훅 설치
sh hooks/install.sh

# 환경변수 설정
cp .env.example .env
# .env 파일에 값 입력

# DB + Redis 실행
docker-compose up -d

# Prisma 마이그레이션
npx prisma migrate dev

# 슬래시 커맨드 등록
npm run deploy:commands

# 봇 실행
npm run dev
```

### 환경변수

| 변수명 | 설명 |
|--------|------|
| `DISCORD_TOKEN` | Discord 봇 토큰 |
| `DISCORD_CLIENT_ID` | Discord 앱 클라이언트 ID |
| `DISCORD_GUILD_ID` | 테스트 서버 ID (길드 커맨드 초기화용) |
| `RIOT_API_KEY` | Riot Games API Key |
| `DATABASE_URL` | PostgreSQL 연결 URL |
| `REDIS_URL` | Redis 연결 URL |

### 유용한 스크립트

```bash
npm run deploy:commands       # 슬래시 커맨드 Discord에 등록
npm run clear:guild-commands  # 길드 커맨드 전체 삭제 (구버전 정리)
npx ts-node src/scripts/debugDb.ts          # DB 상태 확인
npx ts-node src/scripts/debugQueue.ts <PUUID>  # queue=3130 동작 확인
```

---

## 라이선스

Private
