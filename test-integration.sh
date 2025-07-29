#!/bin/bash

# 또방 프로젝트 통합 테스트 스크립트

echo "🚀 또방(DDOBANG) 프로젝트 통합 테스트 시작"
echo "================================================"

# 현재 디렉토리 확인
echo "📂 현재 작업 디렉토리: $(pwd)"

# Backend 디렉토리로 이동
cd DDOBANG_BE

echo "🧹 기존 컨테이너 정리..."
docker-compose -f docker-compose.fullstack.yml down -v

echo "🔧 Docker 이미지 빌드 및 컨테이너 시작..."
docker-compose -f docker-compose.fullstack.yml up --build --detach

echo "⏳ 서비스 초기화 대기 (30초)..."
sleep 30

echo "🔍 컨테이너 상태 확인..."
docker-compose -f docker-compose.fullstack.yml ps

echo "🌐 서비스 헬스체크..."
echo "1. MySQL 연결 테스트"
docker-compose -f docker-compose.fullstack.yml exec mysql mysql -u ddobang -ppassword -e "SELECT 1;" ddobang

echo "2. Redis 연결 테스트"
docker-compose -f docker-compose.fullstack.yml exec redis redis-cli ping

echo "3. Backend API 테스트"
sleep 10
curl -f http://localhost:8080/actuator/health || echo "❌ Backend health check 실패"

echo "4. Frontend 테스트"
curl -f http://localhost:3000/ || echo "❌ Frontend health check 실패"

echo "5. Nginx 프록시 테스트"
curl -f http://localhost:80/health || echo "❌ Nginx health check 실패"

echo "📊 컨테이너 로그 확인 (마지막 20줄)"
echo "--- Backend 로그 ---"
docker-compose -f docker-compose.fullstack.yml logs --tail=20 backend

echo "--- Frontend 로그 ---"
docker-compose -f docker-compose.fullstack.yml logs --tail=20 frontend

echo "✅ 통합 테스트 완료!"
echo "🌍 접속 URL:"
echo "  - Frontend: http://localhost:3000"
echo "  - Backend API: http://localhost:8080/swagger-ui"
echo "  - Nginx Proxy: http://localhost:80"
echo "  - Health Check: http://localhost:80/health"

echo "🛑 테스트 완료 후 정리하려면:"
echo "  docker-compose -f docker-compose.fullstack.yml down -v"