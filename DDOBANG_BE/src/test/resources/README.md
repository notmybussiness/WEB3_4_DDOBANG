# 테스트 리소스

## 🧪 통합 테스트 도구

### SSE 수동 테스트
- **파일**: `sse-manual-test.html`
- **용도**: 브라우저에서 SSE + RabbitMQ 하이브리드 시스템 테스트
- **사용법**: 브라우저에서 직접 열어서 실시간 알림 테스트

### K6 부하 테스트
- **파일**: `load-test-simple.js`
- **용도**: 10명 동시 사용자 부하 테스트
- **사용법**: `k6 run load-test-simple.js`

## 🔧 테스트 환경

백엔드 서버가 실행 중이어야 합니다:
```bash
cd DDOBANG_BE
./gradlew bootRun
```

또는 Docker 환경:
```bash
docker-compose -f docs/deployment/docker-local.yml up -d
```