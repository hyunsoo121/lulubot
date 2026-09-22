-- CreateIndex
CREATE INDEX "champion_ban_match_id_idx" ON "champion_ban"("match_id");

-- CreateIndex
CREATE INDEX "player_match_stat_match_id_idx" ON "player_match_stat"("match_id");

-- CreateIndex
CREATE INDEX "player_match_stat_lol_account_id_idx" ON "player_match_stat"("lol_account_id");

-- CreateIndex
CREATE INDEX "player_match_stat_champion_id_idx" ON "player_match_stat"("champion_id");
