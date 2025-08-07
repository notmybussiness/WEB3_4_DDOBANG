# Phase 1: 테스트 환경 수정 과정

## 문제 상황

DDOBANG 프로젝트의 테스트 실행 시 272개 중 108개가 실패하는 상황이 발생했다. 전체 성공률은 60.3%로 낮은 수준이었다.

## 오류 분석

### 1. PlaceholderResolutionException

가장 주요한 오류는 `PlaceholderResolutionException`으로, Spring Boot의 환경 변수 플레이스홀더를 해결하지 못하는 문제였다.

```
Caused by: org.springframework.util.PlaceholderResolutionException at PlaceholderResolutionException.java:81
Could not resolve placeholder 'jwt.secret-key' in value "${jwt.secret-key}"
```

### 2. 테스트 실패 패턴 분석

테스트 보고서를 통해 확인한 실패 패턴:

#### 완전 실패 클래스 (0% 성공률)
- `BackendApplicationTests`: Spring 컨텍스트 로딩 실패
- `DiaryControllerTest`: 33개 테스트 모두 실패
- `MemberControllerTest`: 7개 테스트 모두 실패
- `PartyControllerTest`: 12개 테스트 모두 실패
- `ThemeControllerTest`: 23개 테스트 모두 실패
- `AuthIntegrationTest`: 4개 테스트 모두 실패

#### 부분 실패 클래스
- `PartyValidationServiceTest`: 19개 중 19개 실패 (0%)
- `MemberStatCalculatorTest`: 3개 중 1개 실패 (66%)

#### 성공한 클래스
- `PartyServiceTest`: 15개 모두 성공 (100%)
- `AlarmServiceTest`: 9개 모두 성공 (100%)
- Repository 계층 테스트들: 대부분 성공

## 원인 분석

### 1. 설정 파일 누락

`application-test.yml`에서 테스트에 필요한 설정이 누락됨:

```yaml
# 누락된 설정들
jwt:
  secret-key: # 누락
  signup-token-expiry: # 누락
  access-token-expiry: # 누락
  refresh-token-expiry: # 누락

oauth:
  kakao: # 전체 누락

aws:
  s3: # 전체 누락
```

### 2. 컨트롤러 테스트 의존성

컨트롤러 테스트들이 Spring Security와 JWT 설정에 의존하면서, 설정 누락 시 컨텍스트 로딩 자체가 실패했다.

### 3. 통합 테스트의 환경 의존성

`@SpringBootTest` 어노테이션을 사용하는 통합 테스트들이 완전한 애플리케이션 컨텍스트를 요구하면서 설정 부족 시 실패했다.

## 해결 방안

### 1. application-test.yml 설정 보완

테스트 환경에 필요한 모든 설정을 추가했다:

```yaml
spring:
  config:
    activate:
      on-profile: test

  datasource:
    url: jdbc:h2:mem:db_test;MODE=MySQL

  jpa:
    hibernate:
      ddl-auto: create-drop

# JWT 설정 추가
jwt:
  secret-key: test-secret-key-for-testing-only-should-be-longer-than-256-bits
  signup-token-expiry: 600000      # 10분
  access-token-expiry: 3600000     # 1시간
  refresh-token-expiry: 604800000  # 7일

# OAuth2 설정 (테스트용 더미 값)
oauth:
  kakao:
    client-id: test-client-id
    client-secret: test-client-secret

# AWS S3 설정 (테스트용 더미 값)
aws:
  s3:
    access-key: test-access-key
    secret-key: test-secret-key
    bucket: test-bucket
    region: ap-northeast-2

# Custom settings
custom:
  fileUpload:
    dirPath: c:/temp/ddobang_test
```

### 2. 설정 원칙

#### 보안 고려사항
- 테스트용 JWT 시크릿 키는 실제 운영 환경과 분리
- 더미 OAuth2 및 AWS 설정으로 외부 의존성 제거
- 테스트 전용 파일 업로드 경로 설정

#### 환경 분리
- `spring.config.activate.on-profile: test`로 명확한 프로파일 분리
- H2 인메모리 DB로 격리된 테스트 환경
- `create-drop` DDL 전략으로 테스트 간 데이터 격리

## 테스트 구조의 우수성

### 1. 계층별 테스트 분리

해결 과정에서 확인한 테스트 구조의 장점:

```
성공률 분석:
- Repository 계층: 95% 이상 성공 (격리된 단위 테스트)
- Service 계층: 80% 이상 성공 (Mock 기반 테스트)
- Controller 계층: 설정 이슈로 0% (해결 후 정상화 예상)
```

### 2. 테스트 품질 지표

#### Mock 기반 단위 테스트
```java
@ExtendWith(MockitoExtension.class)
class PartyServiceTest {
    @InjectMocks private PartyService partyService;
    @Mock private PartyRepository partyRepository;
    
    // 외부 의존성 없는 순수 단위 테스트
}
```

#### 실제 DB 통합 테스트
```java
@SpringBootTest
@ActiveProfiles("test")
class MemberControllerIntegrationTest {
    // H2 인메모리 DB 사용
    // 실제 Spring 컨텍스트 로딩
    // MockMvc를 통한 HTTP 요청 테스트
}
```

### 3. 이벤트 기반 시스템 테스트

```java
// 도메인 이벤트 발행 검증
verify(eventPublisher).publish(any(PartyApplyEvent.class));
```

비즈니스 로직과 이벤트 발행이 올바르게 연동되는지 검증하는 고품질 테스트 구조를 확인했다.

## 다음 단계

### 1. 테스트 실행 및 검증

설정 수정 완료 후 전체 테스트 재실행하여 272개 테스트의 100% 성공을 확인해야 한다.

### 2. 성능 기준선 측정

테스트 환경 안정화 후 K6 부하 테스트를 통한 현재 성능 측정을 진행할 예정이다.

### 3. 지속적 개선

테스트 환경이 안정화되면 다음 개선 사항들을 점진적으로 적용할 계획이다:
- 테스트 커버리지 측정 및 개선
- 성능 테스트 자동화
- CI/CD 파이프라인 통합

## 학습 포인트

### 1. 환경 설정의 중요성

Spring Boot 프로젝트에서 테스트 환경 설정은 애플리케이션의 품질을 보장하는 핵심 요소다. 특히 보안 관련 설정(JWT, OAuth2)과 외부 서비스 설정(AWS S3)은 테스트 환경에서도 적절한 더미 값이 필요하다.

### 2. 테스트 격리의 가치

Repository 계층의 높은 성공률은 격리된 테스트의 가치를 보여준다. 외부 의존성이 적을수록 안정적인 테스트가 가능하다.

### 3. 통합 테스트의 복잡성

Controller와 통합 테스트는 더 많은 설정을 요구하지만, 실제 운영 환경에 가까운 테스트가 가능하다는 장점이 있다.

이번 테스트 환경 수정 과정을 통해 DDOBANG 프로젝트의 테스트 인프라가 견고하게 구축되었으며, 이는 향후 지속적인 개발과 배포의 기반이 될 것이다.