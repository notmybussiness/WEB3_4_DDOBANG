# DDOBANG 성능 측정 가이드

## 📊 성능 측정 방법론

### 1. 메모리 사용량 측정

#### JVM 메모리 모니터링
```bash
# 1. JVM 메모리 사용량 확인
jstat -gc [PID] 1s

# 2. Spring Boot Actuator 메트릭
curl http://localhost:8080/actuator/metrics/jvm.memory.used
curl http://localhost:8080/actuator/metrics/jvm.memory.max

# 3. 힙 덤프 분석
jmap -dump:format=b,file=heap.hprof [PID]
```

#### Docker 컨테이너 메모리 모니터링
```bash
# 실시간 메모리 사용량
docker stats ddobang-backend

# 상세 메모리 정보
docker exec ddobang-backend cat /proc/meminfo
```

### 2. API 응답 시간 측정

#### K6 부하 테스트 실행
```bash
# 기본 부하 테스트
k6 run DDOBANG_BE/src/test/resources/load-test-simple.js

# 결과 분석 항목:
# - http_req_duration: 응답 시간
# - http_req_failed: 실패율
# - http_reqs: 총 요청 수
```

#### Spring Boot Actuator 메트릭
```bash
# HTTP 요청 메트릭
curl http://localhost:8080/actuator/metrics/http.server.requests

# 응답 시간 분포
curl http://localhost:8080/actuator/metrics/http.server.requests?tag=uri:/api/v1/parties
```

### 3. SSE 연결 성능 측정

#### 브라우저 개발자 도구
```javascript
// Network 탭에서 EventSource 연결 확인
// - Connection Time: 연결 시간
// - Time to First Byte: 첫 응답까지 시간
// - 메시지 수신 지연 시간
```

#### 커스텀 메트릭 (AlarmEventService)
```java
// EmitterRepository에서 제공하는 메트릭
@GetMapping("/actuator/metrics/sse.connections.active")
@GetMapping("/actuator/metrics/sse.messages.sent")
@GetMapping("/actuator/metrics/sse.connections.total")
```

### 4. RabbitMQ 성능 측정

#### Management UI 메트릭
```
URL: http://localhost:15672
- Queue depth: 큐에 쌓인 메시지 수
- Message rates: 초당 메시지 처리량
- Consumer utilisation: 소비자 활용률
```

#### 커스텀 메트릭 (AlarmMessagePublisher/Consumer)
```java
// 발행 메트릭
curl http://localhost:8080/api/v1/monitoring/alarms/rabbitmq/publisher/stats

// 소비 메트릭  
curl http://localhost:8080/api/v1/monitoring/alarms/rabbitmq/consumer/stats
```

## 📈 측정 가능한 핵심 지표

### 1. 메모리 사용량
- **측정 도구**: `docker stats`, JVM Actuator
- **측정 항목**: 
  - 힙 메모리 사용량 (MB)
  - 최대 힙 메모리 설정
  - GC 빈도 및 시간

### 2. API 응답 시간
- **측정 도구**: K6, Spring Boot Actuator
- **측정 항목**:
  - 평균 응답 시간 (ms)
  - 95 percentile 응답 시간
  - 처리량 (requests/sec)

### 3. SSE 연결 성능
- **측정 도구**: 브라우저 Network 탭, 커스텀 메트릭
- **측정 항목**:
  - 연결 수립 시간 (ms)
  - 메시지 전달 지연 시간 (ms)
  - 동시 연결 수

### 4. RabbitMQ 처리량
- **측정 도구**: RabbitMQ Management, 커스텀 메트릭
- **측정 항목**:
  - 메시지 발행률 (msg/sec)
  - 메시지 소비률 (msg/sec)
  - 큐 적체량 (messages in queue)

## 🧪 실제 측정 시나리오

### 시나리오 1: 베이스라인 측정
```bash
# 1. 애플리케이션 시작 후 5분 대기 (워밍업)
# 2. docker stats로 초기 메모리 사용량 기록
# 3. /actuator/metrics 엔드포인트로 JVM 메트릭 수집
# 4. 기본 API 호출 응답 시간 측정
```

### 시나리오 2: 부하 테스트
```bash
# 1. K6로 10분간 부하 테스트 실행
# 2. 테스트 중 docker stats로 리소스 모니터링
# 3. RabbitMQ Management에서 큐 상태 확인
# 4. 테스트 완료 후 메트릭 수집 및 분석
```

### 시나리오 3: SSE 연결 테스트
```bash
# 1. 50개 브라우저 탭에서 SSE 연결
# 2. 연결 수립 시간 측정
# 3. 파티 생성으로 알림 발생 시킨 후 전달 시간 측정
# 4. 메모리 사용량 변화 모니터링
```

## 📋 측정 결과 기록 템플릿

### 메모리 사용량
```
측정 시점: [날짜/시간]
JVM 설정: -Xms[값] -Xmx[값] -XX:+UseG1GC
힙 사용량: [현재]/[최대] MB ([사용률]%)
GC 빈도: [횟수]/분
비고: [특이사항]
```

### API 성능
```
측정 도구: K6 v[버전]
테스트 시나리오: [동시 사용자 수], [테스트 시간]
평균 응답 시간: [값]ms
95% 응답 시간: [값]ms
최대 응답 시간: [값]ms
처리량: [값] req/sec
실패율: [값]%
```

### SSE 성능
```
측정 방법: [브라우저/도구]
동시 연결 수: [값]
연결 수립 시간: [값]ms
메시지 전달 지연: [값]ms
연결 안정성: [유지율]%
```

## 🔧 지속적 모니터링 설정

### Prometheus + Grafana (선택사항)
```yaml
# docker-compose에 모니터링 추가 시
# - 실시간 메트릭 대시보드
# - 알람 설정 (임계치 초과 시)
# - 장기간 성능 추세 분석
```

### 일일 성능 체크리스트
- [ ] JVM 힙 사용량 < 80%
- [ ] API 응답 시간 < 500ms (95%)
- [ ] SSE 연결 성공률 > 99%
- [ ] RabbitMQ 큐 적체 < 1000 messages