# DDOBANG 프로젝트 아키텍처 분석

## 개요

방탈출 게임 파티 매칭 플랫폼인 DDOBANG 프로젝트의 기술적 아키텍처를 분석하고 취업 포트폴리오 관점에서 개선 방향을 제시한다.

## 프로젝트 구조

### 기술 스택

- **Framework**: Spring Boot 3.4.4
- **Java**: 21 (Build) / 23 (Runtime)
- **Database**: MySQL (Production), H2 (Test)
- **Security**: Spring Security + JWT + OAuth2 (Kakao)
- **ORM**: JPA + QueryDSL
- **Documentation**: SpringDoc OpenAPI 3
- **Monitoring**: Prometheus + Grafana

### 아키텍처 패턴

Domain-Driven Design (DDD) 구조를 기반으로 4개 레이어로 구성

```
├── Domain Layer      # 핵심 비즈니스 로직
├── Application Layer # 서비스 조합 및 트랜잭션
├── Presentation Layer # REST API 컨트롤러
└── Infrastructure Layer # 데이터 접근 및 외부 연동
```

## 도메인 분석

### 핵심 도메인

1. **Party**: 방탈출 파티 생성 및 관리
2. **Member**: 사용자 정보 및 통계
3. **Theme**: 방탈출 테마 정보
4. **Message**: 파티원 간 메시징
5. **Alarm**: 실시간 알림 (SSE)

### 도메인별 구조 품질

각 도메인은 다음 구조를 일관되게 유지

```
domain/{domain-name}/
├── controller/     # REST API 엔드포인트
├── dto/           # 요청/응답 객체
├── entity/        # JPA 엔티티
├── repository/    # 데이터 접근 계층
├── service/       # 비즈니스 로직
├── exception/     # 도메인별 예외
└── types/         # 열거형 및 값 객체
```

## 보안 아키텍처

### 인증/인가 구조

1. **OAuth2 인증**: 카카오 소셜 로그인
2. **JWT 토큰**: Access/Refresh 토큰 분리
3. **Role 기반 권한**: USER/ADMIN 역할 관리
4. **API 보안**: 엔드포인트별 세밀한 권한 제어

### 보안 설정 분석

```java
// SecurityConfig.java 주요 설정
- CORS 설정: 프론트엔드 도메인 허용
- CSRF 비활성화: REST API 특성상 적절
- 세션 비활성화: JWT 기반 무상태 인증
- 필터 체인: JWT 인증 → 예외 처리
```

## 테스트 구조

### 테스트 현황

- **총 테스트**: 272개
- **단위 테스트**: 32개 파일
- **통합 테스트**: 11개 파일
- **성공률**: 164/272 (60.3%)

### 테스트 품질 특징

1. **Mock 기반 단위 테스트**: Mockito 활용
2. **실제 DB 통합 테스트**: H2 인메모리 DB
3. **Spring 컨텍스트 완전 로딩**: 실제 환경과 유사
4. **이벤트 검증**: 도메인 이벤트 발행 확인

## 성능 및 모니터링

### 모니터링 스택

- **Prometheus**: 메트릭 수집
- **Grafana**: 시각화 대시보드
- **Spring Actuator**: 애플리케이션 메트릭

### 현재 성능 상태

- **모니터링 환경**: Docker Compose 기반 구축 완료
- **성능 기준선**: 미측정 상태
- **부하 테스트**: K6 스크립트 준비 완료

## 강점 분석

### 아키텍처 설계

1. **DDD 구조**: 비즈니스 도메인 중심 설계
2. **이벤트 기반**: EventPublisher를 통한 느슨한 결합
3. **계층 분리**: 명확한 책임 분리

### 개발 품질

1. **현대적 기술 스택**: 최신 Spring Boot 3.x
2. **타입 안전성**: QueryDSL 활용
3. **문서화**: OpenAPI 3.0 통합

### 운영 준비도

1. **모니터링**: Prometheus/Grafana 구축
2. **컨테이너**: Docker 기반 배포 준비
3. **보안**: 다층 보안 구조

## 개선 필요 영역

### 기술적 부채

1. **테스트 실패**: 108개 설정 관련 오류
2. **성능 미측정**: 기준선 성능 데이터 부재
3. **캐시 미구현**: Redis 의존성만 존재

### 운영 측면

1. **CI/CD 파이프라인**: 자동화 배포 체계 부재
2. **클라우드 인프라**: AWS 배포 환경 미구축
3. **로그 관리**: 구조화된 로깅 시스템 부재

## 취업 어필 포인트

### 현재 강점

1. **엔터프라이즈 아키텍처**: DDD 패턴 적용 경험
2. **보안 전문성**: JWT + OAuth2 통합 구현
3. **테스트 주도 개발**: 포괄적 테스트 구조

### 개선 후 목표

1. **성능 엔지니어링**: 측정 기반 최적화 경험
2. **클라우드 운영**: AWS 인프라 구축 경험
3. **DevOps 역량**: CI/CD 파이프라인 구축 경험

## 결론

DDOBANG 프로젝트는 현대적 Spring Boot 기반의 견고한 아키텍처를 가지고 있으나, 성능 최적화와 클라우드 배포 경험을 통해 취업 포트폴리오로서의 가치를 더욱 높일 수 있다. 다음 단계에서는 테스트 환경 안정화를 시작으로 단계적 개선을 진행할 예정이다.