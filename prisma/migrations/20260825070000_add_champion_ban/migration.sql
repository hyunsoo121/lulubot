-- 챔피언 밴픽률(/밴픽률) 기능을 위한 밴 데이터 테이블 추가
-- Riot API 응답엔 이미 밴 데이터가 있었지만 지금까지 저장하지 않고 있었음.
-- 이 마이그레이션 적용 이후 새로 스캔되는 매치부터만 밴 데이터가 쌓인다.

-- CreateTable
CREATE TABLE "champion_ban" (
    "id" BIGSERIAL NOT NULL,
    "match_id" BIGINT NOT NULL,
    "team" "Team" NOT NULL,
    "champion_id" INTEGER NOT NULL,
    "pick_turn" INTEGER NOT NULL,

    CONSTRAINT "champion_ban_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "champion_ban" ADD CONSTRAINT "champion_ban_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "match_record"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
