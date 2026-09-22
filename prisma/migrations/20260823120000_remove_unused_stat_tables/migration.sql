-- 사용되지 않는 테이블 제거 (코드베이스 전체 검색 결과 참조 0건)
-- champion_stat, position_stat: 챔피언/포지션별 랭킹은 player_match_stat에서 즉시 집계하는 방식으로 대체
-- achievement, user_achievement: 칭호(user_title) 시스템과 중복되는 미사용 기능

-- DropForeignKey
ALTER TABLE "champion_stat" DROP CONSTRAINT "champion_stat_lol_account_id_fkey";

-- DropForeignKey
ALTER TABLE "champion_stat" DROP CONSTRAINT "champion_stat_guild_server_id_fkey";

-- DropForeignKey
ALTER TABLE "position_stat" DROP CONSTRAINT "position_stat_lol_account_id_fkey";

-- DropForeignKey
ALTER TABLE "position_stat" DROP CONSTRAINT "position_stat_guild_server_id_fkey";

-- DropForeignKey
ALTER TABLE "user_achievement" DROP CONSTRAINT "user_achievement_lol_account_id_fkey";

-- DropForeignKey
ALTER TABLE "user_achievement" DROP CONSTRAINT "user_achievement_achievement_id_fkey";

-- DropTable
DROP TABLE "champion_stat";

-- DropTable
DROP TABLE "position_stat";

-- DropTable
DROP TABLE "achievement";

-- DropTable
DROP TABLE "user_achievement";
