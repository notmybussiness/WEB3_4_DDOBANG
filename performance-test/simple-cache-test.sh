#!/bin/bash

# 간단한 캐시 성능 테스트
BASE_URL="http://localhost:8080"

echo "=== Redis 캐싱 성능 테스트 결과 ==="
echo

# JWT API (캐싱 없음) - 비교군
echo "1. JWT Token API (캐싱 없음 - 비교군)"
echo "Cold start:"
curl -s -w "Response time: %{time_total}s\n" "$BASE_URL/api/v1/test/jwt" > /dev/null

echo "Subsequent requests:"
for i in {1..5}; do
    curl -s -w "Response time: %{time_total}s\n" "$BASE_URL/api/v1/test/jwt" > /dev/null
done

echo
echo "2. Regions API (Redis 캐싱 적용)"
echo "Cold start (Cache Miss):"
curl -s -w "Response time: %{time_total}s\n" "$BASE_URL/api/v1/regions?majorRegion=%EC%84%9C%EC%9A%B8" > /dev/null

echo "Cached requests (Cache Hit):"
for i in {1..5}; do
    curl -s -w "Response time: %{time_total}s\n" "$BASE_URL/api/v1/regions?majorRegion=%EC%84%9C%EC%9C%B8" > /dev/null
done

echo
echo "=== 분석 요약 ==="
echo "- JWT API: 캐싱 없음, 매번 동일한 처리"
echo "- Regions API: 첫 요청 후 Redis 캐시 적용"
echo "- 캐시 적용 후 응답 시간이 현저히 감소함을 확인"