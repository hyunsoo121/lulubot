#!/bin/bash
# EC2에서 DB 스키마 반영 시 실행
# 사용법: ./scripts/migrate.sh [ECR_REPOSITORY]
# ECR_REPOSITORY를 생략하면 환경변수 ECR_REPOSITORY 또는 기본값(lulubot)을 사용

set -e

cd ~/lulubot

ECR_REPOSITORY="${1:-${ECR_REPOSITORY:-lulubot}}"
# repositories[0]으로 임의 선택하지 않고 이름으로 정확히 조회 (계정에 리포가 여러 개여도 안전)
ECR_REGISTRY=$(aws ecr describe-repositories \
  --repository-names "$ECR_REPOSITORY" \
  --query 'repositories[0].repositoryUri' --output text | cut -d'/' -f1)

docker run --rm \
  --pull always \
  --network lulubot-net \
  --env-file .env \
  $ECR_REGISTRY/$ECR_REPOSITORY:latest \
  npx prisma migrate deploy
