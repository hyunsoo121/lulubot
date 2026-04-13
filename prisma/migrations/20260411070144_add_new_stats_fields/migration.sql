/*
  Warnings:

  - You are about to drop the column `is_mvp` on the `player_match_stat` table. All the data in the column will be lost.
  - You are about to drop the column `mvp_count` on the `user_global_stat` table. All the data in the column will be lost.
  - You are about to drop the column `mvp_count` on the `user_server_stat` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[guild_server_id,title_code,lol_account_id]` on the table `user_title` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "user_title_guild_server_id_title_code_key";

-- AlterTable
ALTER TABLE "player_match_stat" DROP COLUMN "is_mvp",
ADD COLUMN     "control_wards_placed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "dmg_per_gold" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "dmg_share" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "gold_share" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "user_global_stat" DROP COLUMN "mvp_count";

-- AlterTable
ALTER TABLE "user_server_stat" DROP COLUMN "mvp_count";

-- AlterTable
ALTER TABLE "user_title" ADD COLUMN     "stat_value" DOUBLE PRECISION;

-- CreateIndex
CREATE UNIQUE INDEX "user_title_guild_server_id_title_code_lol_account_id_key" ON "user_title"("guild_server_id", "title_code", "lol_account_id");
