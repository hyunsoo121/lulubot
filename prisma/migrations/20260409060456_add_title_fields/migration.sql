-- AlterTable
ALTER TABLE "player_match_stat" ADD COLUMN     "baron_kills" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "dragon_kills" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "enemy_jungle_minions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "first_blood_kill" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "heals_on_teammates" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "kill_participation" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "objectives_stolen" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "penta_kills" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "quadra_kills" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "shield_on_teammates" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "solo_kills" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "time_ccing_others" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "turret_kills" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "wards_killed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "wards_placed" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "user_title" (
    "id" BIGSERIAL NOT NULL,
    "lol_account_id" BIGINT NOT NULL,
    "guild_server_id" BIGINT NOT NULL,
    "title_code" VARCHAR(50) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_title_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_title_guild_server_id_title_code_key" ON "user_title"("guild_server_id", "title_code");

-- AddForeignKey
ALTER TABLE "user_title" ADD CONSTRAINT "user_title_lol_account_id_fkey" FOREIGN KEY ("lol_account_id") REFERENCES "lol_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_title" ADD CONSTRAINT "user_title_guild_server_id_fkey" FOREIGN KEY ("guild_server_id") REFERENCES "guild_server"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
