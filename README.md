# LuluBot

한국 리그 오브 레전드 내전 커뮤니티를 위한 전적 관리 디스코드 봇.

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
| 배포 | Docker + AWS EC2 + ECR |
| CI/CD | GitHub Actions |

---

## 서비스 플로우

```
유저가 /계정등록 실행
  └─ Riot API로 PUUID 조회 → DB 저장
       └─ 백그라운드에서 전체 커스텀 게임 스캔 (queue=3130)
            └─ 매치 저장 → 전적/랭킹/칭호 조회 가능

/전적갱신 실행
  └─ 마지막 저장 매치 이후 신규 커스텀 게임만 증분 스캔
       └─ 칭호 재계산
```

---

## 구현된 명령어

### 계정
| 명령어 | 설명 |
|--------|------|
| `/계정등록 @유저 닉네임#태그` | 라이엇 계정 연결 + 백그라운드 전체 스캔 |
| `/멤버등록 @유저 닉네임#태그` | 관리자가 다른 유저 계정 등록 |
| `/내정보` | 연결된 계정 및 랭크 확인 |
| `/계정삭제` | 본인 데이터 전체 삭제 |

### 전적
| 명령어 | 설명 |
|--------|------|
| `/전적갱신 [@멤버]` | 본인 또는 지정 멤버 전적 갱신 (3분 쿨다운) |
| `/전적 [@유저]` | 서버 내 커스텀 게임 누적 통계 + 보유 칭호 |
| `/전체전적 [@유저]` | 전 서버 합산 커리어 |
| `/최근경기 [@유저]` | 마지막 내전 결과 상세 |
| `/랭킹` | 서버 멤버 종합 랭킹 (승률 → KDA 순) |
| `/라인랭킹` | 포지션별 특화 지표 랭킹 |
| `/챔피언 [@유저]` | 챔피언별 전적 |
| `/칭호` | 서버 칭호 보유자 목록 |
| `/칭호순위` | 특정 칭호 전체 순위 (autocomplete) |
| `/듀오` | 듀오 조합별 승률 및 플레이 횟수 |

### 관리자
| 명령어 | 설명 |
|--------|------|
| `/전체갱신` | 서버 전체 멤버 전적 순차 갱신 (관리자 전용) |
| `/데이터초기화` | 서버 전적/통계 초기화 (관리자 전용) |

---

## 전적 스캔 구조

- **큐 필터**: `queue=3130` (커스텀 게임만 — 랭크/일반/ARAM 제외)
- **증분 스캔**: 마지막 저장 매치 `playedAt` 기준으로 신규 매치만 조회
- **비정상 경기 필터**: 5분 미만 또는 승리팀 없는 경기 제외
- **Rate Limit 대응**: 429 시 `Retry-After` 헤더 대기 후 자동 재시도 (최대 5회)
- **중단 복구**: 봇 재시작 시 중단된 스캔 감지 → 부분 저장 데이터 초기화 → 다음 갱신 시 전체 재스캔
- **스캔 락**: Redis로 중복 스캔 방지 (TTL 30분)
- **쿨다운**: 3분에 1회 제한

---

## 칭호 시스템

40여 개의 칭호를 `/전적갱신` 시 자동 재계산. 주요 칭호:

| 카테고리 | 칭호 예시 |
|----------|-----------|
| 전투 | 학살자, 생존왕, 킹메이커, 펜타킬러 |
| 딜/탱 | DPM머신, 샌드백, 딜폭군, 골드효율 |
| 오브젝트 | 용사냥꾼, 바론사냥꾼 |
| 시야 | 만물의눈, 와드장인, 핑와장인 |
| 라인별 | TOPKING, JUGKING, MIDKING, ADKING, SUPKING 등 |

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

# 환경변수 설정
cp .env.example .env
# .env 파일에 값 입력

# 로컬 DB + Redis 실행
docker compose up -d

# Prisma 스키마 반영
npx prisma db push

# Prisma 클라이언트 생성
npx prisma generate

# 슬래시 커맨드 Discord에 등록
npm run deploy:commands

# 봇 실행 (개발 모드)
npm run dev
```

### 환경변수

| 변수명 | 설명 |
|--------|------|
| `DISCORD_TOKEN` | Discord 봇 토큰 |
| `DISCORD_CLIENT_ID` | Discord 앱 클라이언트 ID |
| `RIOT_API_KEY` | Riot Games API Key |
| `RIOT_TXT_CONTENT` | Riot 도메인 인증용 riot.txt 내용 |
| `DATABASE_URL` | PostgreSQL 연결 URL |
| `REDIS_URL` | Redis 연결 URL |
| `EXPRESS_SECRET` | Express 서버 시크릿 |
| `PORT` | Express 서버 포트 (기본: 3000) |

### 유용한 스크립트

```bash
npm run deploy:commands          # 슬래시 커맨드 Discord에 등록
npm run clear:guild-commands     # 길드 커맨드 전체 삭제 (구버전 정리)
npm run build                    # TypeScript 빌드
npm run lint                     # ESLint 검사
npx ts-node src/scripts/debugDb.ts              # DB 상태 확인
npx ts-node src/scripts/recalcTitles.ts         # 칭호 수동 재계산
```

---

## 배포 (AWS)

### 인프라 구성

```
GitHub Actions
  └─ Docker 이미지 빌드
       └─ Amazon ECR push
            └─ EC2 SSH → docker compose pull & up
```

### AWS 리소스

- **EC2**: 앱 서버 (Amazon Linux 2023, t3.small 이상)
- **ECR**: Docker 이미지 레지스트리
- **RDS**: PostgreSQL (db.t3.micro 이상)
- **ElastiCache 또는 EC2 내 Redis 컨테이너**

### EC2 초기 세팅

```bash
# EC2 접속 후
bash scripts/ec2-setup.sh

# ~/lulubot/ 디렉토리에 아래 파일 업로드
# - docker-compose.prod.yml
# - .env (프로덕션 값)
```

### GitHub Secrets 등록

| Secret | 설명 |
|--------|------|
| `AWS_ACCESS_KEY_ID` | IAM 액세스 키 |
| `AWS_SECRET_ACCESS_KEY` | IAM 시크릿 키 |
| `AWS_REGION` | 리전 (예: `ap-northeast-2`) |
| `ECR_REPOSITORY` | ECR 레포지토리 이름 |
| `EC2_HOST` | EC2 퍼블릭 IP |
| `EC2_USER` | EC2 사용자명 (예: `ec2-user`) |
| `EC2_SSH_KEY` | EC2 `.pem` 키 파일 전체 내용 |

### 배포

`main` 브랜치에 push하면 GitHub Actions가 자동으로 빌드 → ECR push → EC2 배포까지 실행합니다.

---

## 웹사이트

Express 서버에서 함께 서빙됩니다.

| 경로 | 내용 |
|------|------|
| `/` | 봇 소개 랜딩 페이지 |
| `/privacy` | 개인정보처리방침 |
| `/terms` | 이용약관 |
| `/riot.txt` | Riot 도메인 인증 |

---

## 라이선스

Private
