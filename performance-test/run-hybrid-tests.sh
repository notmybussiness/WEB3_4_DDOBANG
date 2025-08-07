#!/bin/bash

# DDOBANG RabbitMQ + SSE 하이브리드 알림 시스템 성능 테스트 스크립트

set -e

echo "🚀 DDOBANG 하이브리드 알림 시스템 성능 테스트 시작"
echo "=================================================="

# 환경 변수 설정
export BASE_URL=${BASE_URL:-"http://localhost:8080"}
export RABBITMQ_URL=${RABBITMQ_URL:-"http://localhost:15672"}

# 테스트 결과 디렉토리 생성
RESULTS_DIR="./test-results/hybrid-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$RESULTS_DIR"

echo "📊 테스트 결과 저장 경로: $RESULTS_DIR"

# 1. 시스템 상태 확인
echo ""
echo "🔍 시스템 상태 확인..."
echo "=================================="

# Backend API 상태 확인
if curl -s "$BASE_URL/actuator/health" > /dev/null; then
    echo "✅ Backend API: 정상"
else
    echo "❌ Backend API: 연결 실패"
    exit 1
fi

# RabbitMQ Management 상태 확인 (선택적)
if curl -s "$RABBITMQ_URL/api/overview" > /dev/null; then
    echo "✅ RabbitMQ Management: 정상"
    RABBITMQ_AVAILABLE=true
else
    echo "⚠️ RabbitMQ Management: 비활성화 (SSE 전용 모드)"
    RABBITMQ_AVAILABLE=false
fi

# JWT 토큰 생성 테스트
echo ""
echo "🔐 인증 시스템 확인..."
TOKEN_RESPONSE=$(curl -s "$BASE_URL/api/v1/test/auth/token")
if echo "$TOKEN_RESPONSE" | grep -q "accessToken"; then
    echo "✅ JWT 토큰 생성: 정상"
else
    echo "❌ JWT 토큰 생성: 실패"
    echo "응답: $TOKEN_RESPONSE"
    exit 1
fi

# 2. SSE 연결 부하 테스트
echo ""
echo "📡 SSE 연결 부하 테스트..."
echo "=================================="

k6 run \
    --env K6_SCENARIO=sse_load_test \
    --env BASE_URL="$BASE_URL" \
    --out json="$RESULTS_DIR/sse-load-test.json" \
    --summary-export="$RESULTS_DIR/sse-load-summary.json" \
    rabbitmq-hybrid-load-test.js

echo "✅ SSE 부하 테스트 완료"

# 3. 하이브리드 알림 시스템 테스트
echo ""
echo "🔄 하이브리드 알림 시스템 테스트..."
echo "=================================="

k6 run \
    --env K6_SCENARIO=hybrid_notification_test \
    --env BASE_URL="$BASE_URL" \
    --env RABBITMQ_URL="$RABBITMQ_URL" \
    --out json="$RESULTS_DIR/hybrid-test.json" \
    --summary-export="$RESULTS_DIR/hybrid-summary.json" \
    rabbitmq-hybrid-load-test.js

echo "✅ 하이브리드 테스트 완료"

# 4. 대용량 알림 발송 테스트
echo ""
echo "📦 대용량 알림 발송 테스트..."
echo "=================================="

k6 run \
    --env K6_SCENARIO=bulk_notifications \
    --env BASE_URL="$BASE_URL" \
    --out json="$RESULTS_DIR/bulk-test.json" \
    --summary-export="$RESULTS_DIR/bulk-summary.json" \
    rabbitmq-hybrid-load-test.js

echo "✅ 대량 알림 테스트 완료"

# 5. 시스템 메트릭 수집
echo ""
echo "📈 시스템 메트릭 수집..."
echo "=================================="

# 알림 시스템 상태 수집
curl -s "$BASE_URL/api/v1/monitoring/alarms/status" | jq . > "$RESULTS_DIR/alarm-system-status.json" 2>/dev/null || true

# SSE 연결 상태 수집
curl -s "$BASE_URL/api/v1/monitoring/alarms/sse/connections" | jq . > "$RESULTS_DIR/sse-connections.json" 2>/dev/null || true

# RabbitMQ 통계 수집 (가능한 경우)
if [ "$RABBITMQ_AVAILABLE" = true ]; then
    curl -s "$BASE_URL/api/v1/monitoring/alarms/rabbitmq/publisher/stats" | jq . > "$RESULTS_DIR/publisher-stats.json" 2>/dev/null || true
    curl -s "$BASE_URL/api/v1/monitoring/alarms/rabbitmq/consumer/stats" | jq . > "$RESULTS_DIR/consumer-stats.json" 2>/dev/null || true
fi

# Spring Boot Actuator 메트릭 수집
curl -s "$BASE_URL/actuator/metrics/rabbitmq.messages.published" > "$RESULTS_DIR/rabbitmq-published-metrics.json" 2>/dev/null || true
curl -s "$BASE_URL/actuator/metrics/sse.connections.active" > "$RESULTS_DIR/sse-metrics.json" 2>/dev/null || true

echo "✅ 메트릭 수집 완료"

# 6. 테스트 결과 분석 및 리포트 생성
echo ""
echo "📋 테스트 결과 분석..."
echo "=================================="

# 간단한 성능 분석
TOTAL_REQUESTS=$(cat "$RESULTS_DIR"/*.json | jq -s '.[].metrics.http_reqs.values.count // 0' | jq -s 'add' 2>/dev/null || echo "0")
AVG_RESPONSE_TIME=$(cat "$RESULTS_DIR"/*.json | jq -s '.[].metrics.http_req_duration.values.avg // 0' | jq -s 'add / length' 2>/dev/null || echo "0")

# 결과 요약 생성
cat > "$RESULTS_DIR/test-summary.md" << EOF
# DDOBANG 하이브리드 알림 시스템 성능 테스트 결과

## 테스트 환경
- **실행 시간**: $(date)
- **Backend URL**: $BASE_URL
- **RabbitMQ URL**: $RABBITMQ_URL
- **RabbitMQ 상태**: $([ "$RABBITMQ_AVAILABLE" = true ] && echo "활성화" || echo "비활성화")

## 주요 성능 지표
- **총 요청 수**: $TOTAL_REQUESTS
- **평균 응답 시간**: ${AVG_RESPONSE_TIME}ms
- **테스트 시나리오**: 3개 (SSE 부하, 하이브리드, 대량 알림)

## 테스트 시나리오 결과

### 1. SSE 연결 부하 테스트
- **목표**: 50개 동시 SSE 연결 유지
- **지속 시간**: 2분
- **결과 파일**: sse-load-test.json

### 2. 하이브리드 알림 시스템 테스트
- **목표**: RabbitMQ + SSE 통합 알림 처리
- **부하 패턴**: 10 → 50 → 30 → 0 VUs
- **결과 파일**: hybrid-test.json

### 3. 대용량 알림 발송 테스트
- **목표**: 100회 반복 알림 발송
- **동시 사용자**: 10명
- **결과 파일**: bulk-test.json

## 시스템 메트릭
- **알림 시스템 상태**: alarm-system-status.json
- **SSE 연결 상태**: sse-connections.json
- **Publisher 통계**: publisher-stats.json
- **Consumer 통계**: consumer-stats.json

## 권장사항
1. **SSE 연결 풀링**: 장시간 연결 유지를 위한 커넥션 풀 최적화 고려
2. **RabbitMQ 큐 모니터링**: 메시지 적체 상황 실시간 모니터링 필요
3. **장애 복구**: SSE 연결 끊김 시 자동 재연결 메커니즘 강화
4. **성능 최적화**: 높은 부하 상황에서 응답 시간 개선 방안 검토

## 다음 단계
- WebSocket 프로토콜 도입 검토
- Kafka 이벤트 스트리밍 아키텍처 설계
- 마이크로서비스 분리 전략 수립
EOF

echo ""
echo "🎉 모든 테스트 완료!"
echo "=================================="
echo "📁 결과 디렉토리: $RESULTS_DIR"
echo "📄 요약 보고서: $RESULTS_DIR/test-summary.md"
echo ""

# 테스트 결과 요약 출력
echo "📊 빠른 요약:"
echo "  - 총 요청: $TOTAL_REQUESTS"
echo "  - 평균 응답시간: ${AVG_RESPONSE_TIME}ms"
echo "  - RabbitMQ: $([ "$RABBITMQ_AVAILABLE" = true ] && echo "활성화" || echo "비활성화")"
echo ""

# 다음 단계 안내
echo "🚀 다음 단계:"
echo "  1. 결과 분석 후 WebSocket 도입 준비"
echo "  2. docker-compose up -d로 전체 환경 실행"
echo "  3. 성능 개선 및 최적화 적용"
echo ""

echo "테스트 스크립트 실행 완료! 🏁"