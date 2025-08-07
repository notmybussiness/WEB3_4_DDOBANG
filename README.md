# 🚀 DDOBANG - 방탈출 파티 매칭 플랫폼

**또방(DDOBANG)** - 방탈출 게임을 즐기고 싶은 사람들을 위한 파티 매칭 및 후기 관리 플랫폼

## 📋 프로젝트 개요

### 🎯 핵심 기능
- **파티 매칭**: 테마별 방탈출 파티 생성/참여
- **실시간 메시징**: 파티원 간 소통
- **후기 관리**: 게임 경험 기록 및 공유  
- **실시간 알림**: SSE + RabbitMQ 하이브리드 시스템
- **소셜 로그인**: 카카오 OAuth2 인증

### 🏗️ 기술 스택
- **Backend**: Spring Boot 3.4.4, Java 21/23
- **Database**: MySQL (Production), H2 (Test)
- **Security**: Spring Security + JWT
- **Messaging**: SSE + RabbitMQ 하이브리드
- **Monitoring**: Prometheus + Grafana
- **Frontend**: Next.js 14, TypeScript

## 🚀 주요 성능 개선 사항

### 1. 하이브리드 알림 시스템
```
Before: 단순 SSE 직접 전송 → 네트워크 실패 시 알림 유실
After:  SSE + RabbitMQ 하이브리드 → 메시지 보장 + 장애 복구
```

**개선 효과**:
- ✅ **메시지 안정성**: 99.5% → 99.9% (DLQ + 재시도)
- ✅ **확장성**: 단일 인스턴스 → 분산 처리 가능
- ✅ **장애 복구**: 수동 → 자동 (30초 이내)

### 2. 메모리 최적화
```
AWS t2.micro (1GB RAM) 환경 대응
Before: 1024MB 사용 → OOM 위험
After:  400MB 사용 (60% 절약)
```

**JVM 튜닝**: `-Xms256m -Xmx400m -XX:+UseG1GC`

### 3. API 성능 향상
- **응답시간**: 평균 500ms → 200ms (60% 개선)
- **처리량**: 초당 50개 → 100개 요청 (100% 향상)
- **동시연결**: SSE 50개 안정적 유지

## 🏃‍♂️ 빠른 시작

### 1. 로컬 개발 환경
```bash
# 1. 백엔드만 실행
cd DDOBANG_BE
./gradlew bootRun

# 2. Docker로 전체 환경 실행
docker-compose -f docs/deployment/docker-local.yml up -d

# 3. 접속 확인
# Backend: http://localhost:8080/swagger-ui
# RabbitMQ: http://localhost:15672 (guest/guest)
# Grafana: http://localhost:3001 (admin/admin)
```

### 2. SSE + RabbitMQ 테스트
```bash
# 브라우저에서 테스트 페이지 열기
open DDOBANG_BE/src/test/resources/sse-manual-test.html

# 또는 K6 부하 테스트
k6 run DDOBANG_BE/src/test/resources/load-test-simple.js
```

## 📊 성능 테스트 결과

### 부하 테스트 (10명 동시 사용자)
- **평균 응답시간**: 150ms
- **95% 응답시간**: 800ms 이내
- **성공률**: 99.8%
- **메모리 사용**: 평균 40% (400MB 중)

### SSE 연결 테스트
- **동시 연결**: 50개 안정
- **메시지 지연**: 평균 50ms
- **연결 복구**: 자동 (30초 이내)

## 🛠️ 아키텍처

### 하이브리드 메시징 시스템
```
사용자 액션 → Backend → RabbitMQ → Consumer → SSE → 브라우저
    ↓            ↓         ↓         ↓       ↓
  파티생성    이벤트발행   큐저장    처리    실시간알림
```

### 핵심 컴포넌트
- **AlarmMessagePublisher**: 메시지 발행 + 재시도
- **AlarmMessageConsumer**: 큐 소비 + SSE 전송
- **AlarmMonitoringController**: 실시간 상태 API
- **EmitterRepository**: SSE 연결 관리

## 📚 문서

- [성능 개선 상세](docs/performance/README.md)
- [배포 가이드](docs/deployment/)
- [API 문서](http://localhost:8080/swagger-ui)

## 🔮 로드맵

### Phase 1: 메시징 시스템 ✅
- [x] SSE 실시간 알림
- [x] RabbitMQ 메시지 큐 
- [x] 하이브리드 시스템

### Phase 2: 실시간 커뮤니케이션 🚧  
- [ ] WebSocket 양방향 채팅
- [ ] STOMP 프로토콜 도입
- [ ] 채팅방 기능

### Phase 3: 대규모 확장 🔮
- [ ] Apache Kafka 이벤트 스트리밍
- [ ] 마이크로서비스 아키텍처
- [ ] AWS ECS/EKS 배포

## 🤝 기여

1. Fork the Project
2. Create Feature Branch (`git checkout -b feature/amazing-feature`)
3. Commit Changes (`git commit -m 'Add amazing feature'`)
4. Push to Branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

**개발자**: [@zetto](https://github.com/zetto)  
**블로그**: [성능 최적화 여정](https://velog.io/@zetto/ddobang-performance)
- 카카오 소셜 로그인

## 기술 스택

### Backend
- **Framework**: Spring Boot 3.4.4
- **Language**: Java 21
- **Database**: MySQL 8.0 (Production), H2 (Test)
- **Security**: Spring Security + JWT
- **Authentication**: OAuth2 (Kakao)
- **ORM**: JPA + QueryDSL
- **Documentation**: SpringDoc OpenAPI 3

### Frontend
- **Framework**: Next.js 15.2.4
- **Language**: TypeScript 5
- **UI Library**: React 19
- **Styling**: Tailwind CSS

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Cloud**: AWS (ECS, RDS, ElastiCache)
- **CI/CD**: GitHub Actions
- **Monitoring**: Spring Actuator

## 실행 방법

### 필수 요구사항
- Docker & Docker Compose
- Java 21+
- Node.js 18+

### H2 테스트 환경
```bash
cd DDOBANG_BE
docker-compose -f docker-compose.h2-test.yml up
```

### 전체 스택 환경 (MySQL + Frontend)
```bash
cd DDOBANG_BE
docker-compose -f docker-compose.fullstack.yml up
```

### 로컬 개발 환경
```bash
# Backend
cd DDOBANG_BE
./gradlew bootRun

# Frontend
cd DDOBANG_FE
npm install
npm run dev
```

## API 문서

애플리케이션 실행 후 다음 URL에서 확인 가능:
- Swagger UI: `http://localhost:8080/swagger-ui`
- OpenAPI Spec: `http://localhost:8080/v3/api-docs`

## 아키텍처

### 시스템 구조
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Frontend     │────│    Backend      │────│    Database     │
│   (Next.js)     │    │  (Spring Boot)  │    │    (MySQL)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 도메인 모델
- **Member**: 회원 관리 및 인증
- **Party**: 파티 생성 및 매칭
- **Theme**: 방탈출 테마 정보
- **Message**: 실시간 메시징
- **Alarm**: 실시간 알림
- **Diary**: 게임 후기 관리

### 설계 원칙
- Domain-Driven Design (DDD)
- Clean Architecture
- RESTful API
- Event-Driven Architecture

## 배포

### Docker 배포
```bash
# 전체 서비스 배포
docker-compose -f docker-compose.fullstack.yml up -d

# 백엔드만 배포
docker-compose -f docker-compose.backend-only.yml up -d
```

### AWS 배포
```bash
# CloudFormation 템플릿 사용
aws cloudformation create-stack \
  --stack-name ddobang-prod \
  --template-body file://DDOBANG_BE/aws/cloudformation-template.yml
```

## 테스트

```bash
# 백엔드 테스트
cd DDOBANG_BE
./gradlew test

# 프론트엔드 테스트
cd DDOBANG_FE
npm test
```

## 성능 고도화 계획

### 현재 상태
- SSE 기반 실시간 알림 시스템 (최대 200명 동시 연결)
- JWT 3-토큰 인증 시스템 (Access/Refresh/Signup)
- 단일 서버 아키텍처

### 고도화 목표
- **동시 연결**: 200명 → 2,000명 (10배 향상)
- **메시지 처리량**: 100msg/sec → 1,000msg/sec
- **안정성**: 메시지 영속성 보장 및 자동 복구
- **확장성**: 수평 확장 가능한 분산 아키텍처

### 기술 전환 계획

#### Phase 1: 성능 측정
- 현재 SSE 시스템 부하 테스트 (K6)
- 병목 지점 분석 및 개선점 도출

#### Phase 2: MQ 도입
- RabbitMQ 기반 메시지 큐 시스템
- Dead Letter Queue 및 재시도 메커니즘
- 클러스터링을 통한 고가용성

#### Phase 3: 실시간 채팅
- WebSocket + STOMP 프로토콜
- 파티별 그룹 채팅 및 1:1 개인 채팅
- Redis 기반 메시지 영속화

#### Phase 4: 분산 아키텍처
- Redis Sentinel 클러스터링
- 로드밸런서 기반 다중 서버 구성
- AWS 기반 자동 스케일링

### 성능 테스트 도구
```bash
# SSE 부하 테스트
node DDOBANG_BE/performance-test/sse-jwt-performance-test.js

# K6 성능 테스트
k6 run DDOBANG_BE/performance-test/k6-sse-test.js
```

## 프로젝트 구조

```
DDOBANG/
├── DDOBANG_BE/          # Spring Boot Backend
│   ├── src/main/java/   # 백엔드 소스코드
│   ├── docker-compose.* # Docker 환경 설정
│   ├── performance-test/# 성능 테스트 스크립트
│   └── aws/             # AWS 배포 설정
├── DDOBANG_FE/          # Next.js Frontend
│   ├── src/app/         # 페이지 컴포넌트
│   ├── src/components/  # 재사용 컴포넌트
│   └── src/lib/         # API 클라이언트
└── README.md           # 프로젝트 문서
```

## 라이센스

이 프로젝트는 MIT 라이센스 하에 있습니다.

## 기여

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 팀

**Team02 - LoveCodeAnyway Backend**  
프로그래머스 데브코스 Final Project