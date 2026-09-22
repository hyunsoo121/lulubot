-- 토너먼트 코드 발급(/내전생성) 기능 폐기 + 듀오 통계를 실시간 집계 방식으로 전환하며
-- 더 이상 쓰지 않는 테이블 제거

-- DropForeignKey
ALTER TABLE "tournament_code" DROP CONSTRAINT "tournament_code_guild_server_id_fkey";

-- DropForeignKey
ALTER TABLE "tournament_code" DROP CONSTRAINT "tournament_code_issued_by_fkey";

-- DropForeignKey
ALTER TABLE "match_record" DROP CONSTRAINT "match_record_tournament_code_id_fkey";

-- DropForeignKey
ALTER TABLE "duo_stat" DROP CONSTRAINT "duo_stat_guild_server_id_fkey";

-- DropForeignKey
ALTER TABLE "duo_stat" DROP CONSTRAINT "duo_stat_lol_account_id_1_fkey";

-- DropForeignKey
ALTER TABLE "duo_stat" DROP CONSTRAINT "duo_stat_lol_account_id_2_fkey";

-- DropIndex
DROP INDEX "match_record_tournament_code_id_key";

-- AlterTable
ALTER TABLE "match_record" DROP COLUMN "tournament_code_id";

-- DropTable
DROP TABLE "tournament_code";

-- DropTable
DROP TABLE "duo_stat";

-- DropEnum
DROP TYPE "TournamentCodeStatus";
