#!/bin/bash
# EC2 초기 세팅 스크립트 (Amazon Linux 2023 기준)
# 최초 1회만 실행

set -e

echo "=== 1. Docker 설치 ==="
sudo dnf update -y
sudo dnf install -y docker
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER

echo "=== 2. Docker Compose 설치 ==="
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
sudo ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose

echo "=== 3. AWS CLI 설치 ==="
sudo dnf install -y awscli

echo "=== 4. 프로젝트 디렉토리 생성 ==="
mkdir -p ~/lulubot

echo "=== 5. docker-compose.prod.yml 복사 필요 ==="
echo "아래 파일을 ~/lulubot/ 에 업로드하세요:"
echo "  - docker-compose.prod.yml"
echo "  - .env (프로덕션 환경변수)"

echo ""
echo "=== 완료 ==="
echo "재접속 후 docker 명령어를 사용할 수 있습니다 (그룹 적용)"
