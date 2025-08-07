#!/bin/bash
# t2.micro 최적화 부하테스트 실행 스크립트
# Usage: ./run-t2micro-tests.sh

echo "🚀 DDOBANG t2.micro 부하테스트 시작..."
echo "============================================"

# 1. 결과 디렉토리 생성
mkdir -p results
echo "📁 결과 디렉토리 생성 완료"

# 2. t2.micro 최적화 이미지 빌드
echo "🔨 t2.micro 최적화 Docker 이미지 빌드 중..."
cd ../DDOBANG_BE
docker build -f Dockerfile.t2micro -t ddobang-t2micro . || {
    echo "❌ Docker 이미지 빌드 실패"
    exit 1
}

cd ..
echo "✅ Docker 이미지 빌드 완료"

# 3. 백엔드 및 모니터링 서비스 시작
echo "🏃 백엔드 및 모니터링 서비스 시작 중..."
docker-compose -f docker-compose.t2micro-test.yml up -d backend prometheus grafana

echo "⏳ 서비스 준비 대기 중 (60초)..."
sleep 60

# 4. 헬스체크 확인
echo "🔍 서비스 헬스체크 확인 중..."
for i in {1..10}; do
    if curl -f http://localhost:8080/actuator/health >/dev/null 2>&1; then
        echo "✅ 백엔드 서비스 준비 완료"
        break
    fi
    if [ $i -eq 10 ]; then
        echo "❌ 백엔드 서비스 준비 실패"
        exit 1
    fi
    echo "⏳ 헬스체크 재시도 ($i/10)..."
    sleep 10
done

# 5. 부하테스트 실행 시퀀스
echo ""
echo "📊 부하테스트 실행 시작..."
echo "============================================"

# 5-1. 일반 사용자 패턴 테스트
echo "🔄 1단계: 일반 사용자 패턴 테스트 (8분)"
docker-compose -f docker-compose.t2micro-test.yml --profile test up k6-normal
echo "✅ 일반 사용자 패턴 테스트 완료"

# 대기 시간
echo "⏳ 시스템 안정화 대기 (30초)..."
sleep 30

# 5-2. 메모리 스트레스 테스트  
echo "🔄 2단계: 메모리 스트레스 테스트 (2분)"
docker-compose -f docker-compose.t2micro-test.yml --profile stress up k6-memory-stress
echo "✅ 메모리 스트레스 테스트 완료"

# 대기 시간
echo "⏳ 시스템 안정화 대기 (30초)..."
sleep 30

# 5-3. 스파이크 테스트
echo "🔄 3단계: 스파이크 테스트 (1분)"
docker-compose -f docker-compose.t2micro-test.yml --profile spike up k6-spike
echo "✅ 스파이크 테스트 완료"

# 6. 결과 수집
echo ""
echo "📈 테스트 결과 수집 중..."
echo "============================================"

# Prometheus 메트릭 내보내기
echo "📊 Prometheus 메트릭 수집 중..."
curl -G http://localhost:9090/api/v1/query \
    --data-urlencode 'query=jvm_memory_used_bytes{area="heap"}' \
    > performance-test/results/prometheus-memory-metrics.json

curl -G http://localhost:9090/api/v1/query \
    --data-urlencode 'query=http_server_requests_seconds_sum' \
    > performance-test/results/prometheus-response-metrics.json

# 7. 서비스 정리
echo "🧹 테스트 환경 정리 중..."
docker-compose -f docker-compose.t2micro-test.yml down
echo "✅ 테스트 환경 정리 완료"

# 8. 결과 요약
echo ""
echo "🎉 t2.micro 부하테스트 완료!"
echo "============================================"
echo "📄 결과 파일 위치:"
echo "  - 📊 상세 보고서: performance-test/t2-micro-load-test-report.md"
echo "  - 📈 K6 결과: performance-test/results/*-results.json"
echo "  - 📉 Prometheus 메트릭: performance-test/results/prometheus-*.json"
echo ""
echo "📋 다음 단계:"
echo "  1. 보고서 검토 및 병목지점 분석"
echo "  2. Phase 1 최적화 사항 적용"  
echo "  3. 프로덕션 배포 준비"
echo ""
echo "🔗 모니터링 대시보드:"
echo "  - Grafana: http://localhost:3001 (admin/admin123)"
echo "  - Prometheus: http://localhost:9090"
echo ""

# 성공적으로 완료
exit 0