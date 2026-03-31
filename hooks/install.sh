#!/bin/sh

echo "▶ Git 훅 설치 중..."

cp hooks/pre-commit .git/hooks/pre-commit
chmod 0755 .git/hooks/pre-commit

echo "✓ pre-commit 훅 설치 완료"
