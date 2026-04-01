-- CreateEnum
CREATE TYPE "TournamentCodeStatus" AS ENUM ('PENDING', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "Team" AS ENUM ('BLUE', 'RED');

-- CreateTable
CREATE TABLE "user" (
    "id" BIGSERIAL NOT NULL,
    "discord_user_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lol_account" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT,
    "puuid" VARCHAR(78) NOT NULL,
    "game_name" VARCHAR(100) NOT NULL,
    "tag_line" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lol_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guild_server" (
    "id" BIGINT NOT NULL,
    "server_name" VARCHAR(100),
    "is_whitelisted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guild_server_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_guild_server" (
    "user_id" BIGINT NOT NULL,
    "guild_server_id" BIGINT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_guild_server_pkey" PRIMARY KEY ("user_id","guild_server_id")
);

-- CreateTable
CREATE TABLE "tournament_code" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "guild_server_id" BIGINT NOT NULL,
    "issued_by" BIGINT NOT NULL,
    "status" "TournamentCodeStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expired_at" TIMESTAMP(3),

    CONSTRAINT "tournament_code_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_record" (
    "id" BIGSERIAL NOT NULL,
    "match_id" VARCHAR(50) NOT NULL,
    "guild_server_id" BIGINT NOT NULL,
    "tournament_code_id" BIGINT NOT NULL,
    "winner_team" "Team" NOT NULL,
    "game_duration_secs" INTEGER NOT NULL,
    "played_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "match_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_match_stat" (
    "id" BIGSERIAL NOT NULL,
    "match_id" BIGINT NOT NULL,
    "lol_account_id" BIGINT NOT NULL,
    "team" "Team" NOT NULL,
    "champion_id" INTEGER NOT NULL,
    "position" VARCHAR(20) NOT NULL,
    "kills" INTEGER NOT NULL,
    "deaths" INTEGER NOT NULL,
    "assists" INTEGER NOT NULL,
    "cs" INTEGER NOT NULL,
    "damage_dealt" INTEGER NOT NULL,
    "damage_taken" INTEGER NOT NULL,
    "gold_earned" INTEGER NOT NULL,
    "vision_score" INTEGER NOT NULL,
    "is_win" BOOLEAN NOT NULL,
    "is_mvp" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "player_match_stat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_server_stat" (
    "id" BIGSERIAL NOT NULL,
    "lol_account_id" BIGINT NOT NULL,
    "guild_server_id" BIGINT NOT NULL,
    "total_games" INTEGER NOT NULL DEFAULT 0,
    "total_wins" INTEGER NOT NULL DEFAULT 0,
    "total_kills" INTEGER NOT NULL DEFAULT 0,
    "total_deaths" INTEGER NOT NULL DEFAULT 0,
    "total_assists" INTEGER NOT NULL DEFAULT 0,
    "total_damage" BIGINT NOT NULL DEFAULT 0,
    "total_vision_score" INTEGER NOT NULL DEFAULT 0,
    "mvp_count" INTEGER NOT NULL DEFAULT 0,
    "penta_kill_count" INTEGER NOT NULL DEFAULT 0,
    "current_streak" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_server_stat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "champion_stat" (
    "id" BIGSERIAL NOT NULL,
    "lol_account_id" BIGINT NOT NULL,
    "guild_server_id" BIGINT NOT NULL,
    "champion_id" INTEGER NOT NULL,
    "total_games" INTEGER NOT NULL DEFAULT 0,
    "total_wins" INTEGER NOT NULL DEFAULT 0,
    "total_kills" INTEGER NOT NULL DEFAULT 0,
    "total_deaths" INTEGER NOT NULL DEFAULT 0,
    "total_assists" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "champion_stat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "position_stat" (
    "id" BIGSERIAL NOT NULL,
    "lol_account_id" BIGINT NOT NULL,
    "guild_server_id" BIGINT NOT NULL,
    "position" VARCHAR(20) NOT NULL,
    "total_games" INTEGER NOT NULL DEFAULT 0,
    "total_wins" INTEGER NOT NULL DEFAULT 0,
    "total_kills" INTEGER NOT NULL DEFAULT 0,
    "total_deaths" INTEGER NOT NULL DEFAULT 0,
    "total_assists" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "position_stat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "duo_stat" (
    "id" BIGSERIAL NOT NULL,
    "guild_server_id" BIGINT NOT NULL,
    "lol_account_id_1" BIGINT NOT NULL,
    "lol_account_id_2" BIGINT NOT NULL,
    "same_team_games" INTEGER NOT NULL DEFAULT 0,
    "same_team_wins" INTEGER NOT NULL DEFAULT 0,
    "against_games" INTEGER NOT NULL DEFAULT 0,
    "against_wins" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "duo_stat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievement" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "icon" VARCHAR(10) NOT NULL,

    CONSTRAINT "achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_achievement" (
    "id" BIGSERIAL NOT NULL,
    "lol_account_id" BIGINT NOT NULL,
    "achievement_id" BIGINT NOT NULL,
    "achieved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_achievement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_discord_user_id_key" ON "user"("discord_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "lol_account_puuid_key" ON "lol_account"("puuid");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_code_code_key" ON "tournament_code"("code");

-- CreateIndex
CREATE UNIQUE INDEX "match_record_match_id_key" ON "match_record"("match_id");

-- CreateIndex
CREATE UNIQUE INDEX "match_record_tournament_code_id_key" ON "match_record"("tournament_code_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_server_stat_lol_account_id_guild_server_id_key" ON "user_server_stat"("lol_account_id", "guild_server_id");

-- CreateIndex
CREATE UNIQUE INDEX "champion_stat_lol_account_id_guild_server_id_champion_id_key" ON "champion_stat"("lol_account_id", "guild_server_id", "champion_id");

-- CreateIndex
CREATE UNIQUE INDEX "position_stat_lol_account_id_guild_server_id_position_key" ON "position_stat"("lol_account_id", "guild_server_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "duo_stat_guild_server_id_lol_account_id_1_lol_account_id_2_key" ON "duo_stat"("guild_server_id", "lol_account_id_1", "lol_account_id_2");

-- CreateIndex
CREATE UNIQUE INDEX "achievement_code_key" ON "achievement"("code");

-- CreateIndex
CREATE UNIQUE INDEX "user_achievement_lol_account_id_achievement_id_key" ON "user_achievement"("lol_account_id", "achievement_id");

-- AddForeignKey
ALTER TABLE "lol_account" ADD CONSTRAINT "lol_account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_guild_server" ADD CONSTRAINT "user_guild_server_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_guild_server" ADD CONSTRAINT "user_guild_server_guild_server_id_fkey" FOREIGN KEY ("guild_server_id") REFERENCES "guild_server"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_code" ADD CONSTRAINT "tournament_code_guild_server_id_fkey" FOREIGN KEY ("guild_server_id") REFERENCES "guild_server"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_code" ADD CONSTRAINT "tournament_code_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "lol_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_record" ADD CONSTRAINT "match_record_guild_server_id_fkey" FOREIGN KEY ("guild_server_id") REFERENCES "guild_server"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_record" ADD CONSTRAINT "match_record_tournament_code_id_fkey" FOREIGN KEY ("tournament_code_id") REFERENCES "tournament_code"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_match_stat" ADD CONSTRAINT "player_match_stat_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "match_record"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_match_stat" ADD CONSTRAINT "player_match_stat_lol_account_id_fkey" FOREIGN KEY ("lol_account_id") REFERENCES "lol_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_server_stat" ADD CONSTRAINT "user_server_stat_lol_account_id_fkey" FOREIGN KEY ("lol_account_id") REFERENCES "lol_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_server_stat" ADD CONSTRAINT "user_server_stat_guild_server_id_fkey" FOREIGN KEY ("guild_server_id") REFERENCES "guild_server"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "champion_stat" ADD CONSTRAINT "champion_stat_lol_account_id_fkey" FOREIGN KEY ("lol_account_id") REFERENCES "lol_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "champion_stat" ADD CONSTRAINT "champion_stat_guild_server_id_fkey" FOREIGN KEY ("guild_server_id") REFERENCES "guild_server"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position_stat" ADD CONSTRAINT "position_stat_lol_account_id_fkey" FOREIGN KEY ("lol_account_id") REFERENCES "lol_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position_stat" ADD CONSTRAINT "position_stat_guild_server_id_fkey" FOREIGN KEY ("guild_server_id") REFERENCES "guild_server"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duo_stat" ADD CONSTRAINT "duo_stat_guild_server_id_fkey" FOREIGN KEY ("guild_server_id") REFERENCES "guild_server"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duo_stat" ADD CONSTRAINT "duo_stat_lol_account_id_1_fkey" FOREIGN KEY ("lol_account_id_1") REFERENCES "lol_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duo_stat" ADD CONSTRAINT "duo_stat_lol_account_id_2_fkey" FOREIGN KEY ("lol_account_id_2") REFERENCES "lol_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievement" ADD CONSTRAINT "user_achievement_lol_account_id_fkey" FOREIGN KEY ("lol_account_id") REFERENCES "lol_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievement" ADD CONSTRAINT "user_achievement_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "achievement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
