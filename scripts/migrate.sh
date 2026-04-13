#!/bin/bash
# EC2에서 DB 스키마 반영 시 실행
# 사용법: ./scripts/migrate.sh

set -e

cd ~/lulubot

ECR_REGISTRY=$(aws ecr describe-repositories --query 'repositories[0].repositoryUri' --output text | cut -d'/' -f1)
ECR_REPOSITORY=lulubot

docker run --rm \
  --env-file .env \
  $ECR_REGISTRY/$ECR_REPOSITORY:latest \
  npx prisma db push
