# 테스트 환경 구축 및 성능 기준선 측정

## 현재 테스트 환경 상태

### 테스트 구조 분석

#### 전체 테스트 현황
- **총 테스트 수**: 272개
- **성공한 테스트**: 164개 (60.3%)
- **실패한 테스트**: 108개 (39.7%)
- **테스트 파일**: 43개 (단위 테스트 32개, 통합 테스트 11개)

#### 테스트 분류
```
src/test/java/com/ddobang/backend/
├── domain/
│   ├── alarm/          # 알림 도메인 테스트
│   ├── diary/          # 일기 도메인 테스트  
│   ├── member/         # 회원 도메인 테스트
│   ├── party/          # 파티 도메인 테스트
│   ├── region/         # 지역 도메인 테스트
│   ├── store/          # 매장 도메인 테스트
│   ├── theme/          # 테마 도메인 테스트
│   └── upload/         # 업로드 도메인 테스트
└── global/
    ├── auth/           # 인증 테스트
    ├── config/         # 설정 테스트
    └── security/       # 보안 테스트
```

### 테스트 실패 원인 분석

#### PlaceholderResolutionException
```
Could not resolve placeholder 'jwt.secret-key' in value "${jwt.secret-key}"
```

**원인**: application-test.yml에 JWT 설정 누락

**해결 방안**:
```yaml
# application-test.yml 추가 설정
jwt:
  secret-key: test-secret-key-for-testing-only
  signup-token-expiry: 600000
  access-token-expiry: 3600000
  refresh-token-expiry: 604800000

oauth:
  kakao:
    client-id: test-client-id
    client-secret: test-client-secret

aws:
  s3:
    access-key: test-access-key
    secret-key: test-secret-key
    bucket: test-bucket
    region: ap-northeast-2
```

## 테스트 품질 분석

### 우수한 테스트 구조

#### 1. 도메인별 계층화된 테스트
```java
// PartyServiceTest.java 예시
@ExtendWith(MockitoExtension.class)
class PartyServiceTest {
    @InjectMocks private PartyService partyService;
    @Mock private PartyRepository partyRepository;
    @Mock private ThemeService themeService;
    
    // 완전한 Mock 기반 단위 테스트
}
```

#### 2. 통합 테스트의 실제 환경 시뮬레이션
```java
// MemberControllerIntegrationTest.java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class MemberControllerIntegrationTest {
    // 실제 Spring 컨텍스트 로딩
    // H2 인메모리 DB 사용
    // MockMvc를 통한 실제 HTTP 요청 테스트
}
```

#### 3. 이벤트 기반 시스템 테스트
```java
// PartyServiceTest.java에서 이벤트 검증
verify(eventPublisher).publish(any(PartyApplyEvent.class));
```

### 테스트 기술적 특징

#### TestAuthController 활용
```java
@RestController
@RequestMapping("/api/v1/test")
public class TestAuthController {
    // JWT 토큰 즉시 생성으로 인증 테스트 지원
    // Mock 없이 실제 인증 플로우 테스트 가능
}
```

**장점**:
- 실제 JWT 토큰 생성 테스트
- 인증이 필요한 API 테스트 지원
- 통합 테스트에서 실제 보안 컨텍스트 활용

## 성능 테스트 환경 구축

### K6 부하 테스트 스크립트

#### 테스트 시나리오 설계
```javascript
// load-test.js 주요 시나리오
export const options = {
  stages: [
    { duration: '2m', target: 20 },  // 램프업
    { duration: '5m', target: 20 },  // 지속
    { duration: '2m', target: 40 },  // 증가
    { duration: '5m', target: 40 },  // 유지
    { duration: '2m', target: 0 },   // 종료
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'], // 95%ile < 500ms
    'http_req_failed': ['rate<0.01'],   // 에러율 < 1%
  },
};
```

#### 테스트 대상 API
1. **공개 API**: 파티 목록, 테마 목록, 지역 목록
2. **인증 API**: JWT 토큰 획득, 내 정보 조회
3. **비즈니스 API**: 파티 생성 (10% 확률)

### Docker 기반 성능 테스트 환경

#### docker-compose.performance.yml
```yaml
services:
  backend:
    environment:
      - JAVA_OPTS=-Xms512m -Xmx1024m -XX:+UseG1GC
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/actuator/health"]
  
  k6:
    image: grafana/k6:latest
    command: run /scripts/load-test.js
    depends_on:
      backend:
        condition: service_healthy
```

**특징**:
- 헬스체크 기반 의존성 관리
- JVM 튜닝 옵션 적용
- K6 부하 테스트 자동 실행

## 성능 모니터링 설정

### Prometheus 메트릭 수집

#### Spring Actuator 설정
```yaml
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  metrics:
    export:
      prometheus:
        enabled: true
    tags:
      application: ${spring.application.name}
      environment: ${spring.profiles.active}
```

#### 수집 메트릭
- **JVM 메트릭**: 메모리, GC, 스레드
- **HTTP 메트릭**: 요청 수, 응답 시간, 상태 코드
- **데이터베이스 메트릭**: 커넥션 풀, 쿼리 시간
- **비즈니스 메트릭**: 사용자 정의 메트릭

### Grafana 대시보드

#### 모니터링 항목
1. **시스템 메트릭**: CPU, 메모리, 디스크
2. **애플리케이션 메트릭**: 응답 시간, 처리량, 에러율
3. **데이터베이스 메트릭**: 쿼리 성능, 커넥션 상태
4. **비즈니스 메트릭**: 파티 생성률, 사용자 활동

## 테스트 자동화 전략

### 테스트 실행 파이프라인

#### 로컬 개발 환경
```bash
# 1. 단위 테스트 실행
./gradlew test

# 2. 애플리케이션 시작
./gradlew bootRun

# 3. 성능 테스트 실행 (별도 터미널)
k6 run performance-test/load-test.js
```

#### Docker 환경
```bash
# 전체 스택 시작
docker-compose -f docker-compose.performance.yml up -d

# 성능 테스트만 실행
docker-compose -f docker-compose.performance.yml run --rm k6
```

### CI/CD 통합 계획

#### GitHub Actions 워크플로우
```yaml
# .github/workflows/test.yml (예정)
name: Test and Performance
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Unit Tests
        run: ./gradlew test
      - name: Performance Tests
        run: docker-compose -f docker-compose.performance.yml up --abort-on-container-exit
```

## 현재 성능 기준선

### 측정 필요 항목

#### 응답 시간 목표
- **공개 API**: 평균 < 200ms, 95%ile < 500ms
- **인증 API**: 평균 < 300ms, 95%ile < 800ms
- **비즈니스 API**: 평균 < 500ms, 95%ile < 1000ms

#### 처리량 목표
- **동시 사용자**: 100명 이상
- **초당 요청**: 500 RPS 이상
- **에러율**: 1% 미만

#### 리소스 사용량
- **메모리**: 1GB 이하
- **CPU**: 평균 50% 이하
- **데이터베이스**: 커넥션 풀 효율성

## 다음 단계

### 즉시 실행 항목
1. **테스트 환경 수정**: application-test.yml 설정 완료
2. **전체 테스트 실행**: 272개 테스트 100% 성공 확인
3. **성능 기준선 측정**: K6 부하 테스트 실행

### 개선 계획
1. **테스트 커버리지 향상**: SonarQube 도입 검토
2. **성능 테스트 고도화**: 더 복잡한 시나리오 추가
3. **모니터링 개선**: 커스텀 메트릭 및 알림 추가

## 결론

DDOBANG 프로젝트는 이미 높은 품질의 테스트 구조를 가지고 있으며, 설정 문제 해결 후에는 완전한 테스트 자동화가 가능하다. K6 기반 성능 테스트 환경과 Prometheus/Grafana 모니터링 스택을 통해 데이터 기반의 성능 최적화를 수행할 수 있는 기반이 마련되었다.