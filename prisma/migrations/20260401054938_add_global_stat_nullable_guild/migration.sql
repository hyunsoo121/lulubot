-- DropForeignKey
ALTER TABLE "match_record" DROP CONSTRAINT "match_record_guild_server_id_fkey";

-- DropForeignKey
ALTER TABLE "match_record" DROP CONSTRAINT "match_record_tournament_code_id_fkey";

-- AlterTable
ALTER TABLE "match_record" ALTER COLUMN "guild_server_id" DROP NOT NULL,
ALTER COLUMN "tournament_code_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "user_global_stat" (
    "id" BIGSERIAL NOT NULL,
    "lol_account_id" BIGINT NOT NULL,
    "total_games" INTEGER NOT NULL DEFAULT 0,
    "total_wins" INTEGER NOT NULL DEFAULT 0,
    "total_kills" INTEGER NOT NULL DEFAULT 0,
    "total_deaths" INTEGER NOT NULL DEFAULT 0,
    "total_assists" INTEGER NOT NULL DEFAULT 0,
    "total_damage" BIGINT NOT NULL DEFAULT 0,
    "total_vision_score" INTEGER NOT NULL DEFAULT 0,
    "mvp_count" INTEGER NOT NULL DEFAULT 0,
    "penta_kill_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_global_stat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_global_stat_lol_account_id_key" ON "user_global_stat"("lol_account_id");

-- AddForeignKey
ALTER TABLE "match_record" ADD CONSTRAINT "match_record_guild_server_id_fkey" FOREIGN KEY ("guild_server_id") REFERENCES "guild_server"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_record" ADD CONSTRAINT "match_record_tournament_code_id_fkey" FOREIGN KEY ("tournament_code_id") REFERENCES "tournament_code"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_global_stat" ADD CONSTRAINT "user_global_stat_lol_account_id_fkey" FOREIGN KEY ("lol_account_id") REFERENCES "lol_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
