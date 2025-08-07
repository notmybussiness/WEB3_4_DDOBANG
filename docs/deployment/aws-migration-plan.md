# AWS 계정 마이그레이션 계획

## 🎯 현재 상황 분석

### ✅ 보존 자산
- **DNS**: `ddobang.site` (Route 53 또는 외부 DNS 서비스)

### 🔄 마이그레이션 대상
- **기존 AWS 인프라**: t3.small EC2, MySQL, Redis, HAProxy, Nginx
- **새 계정으로 이전**: 전체 인프라 재구축

## 🚀 마이그레이션 전략

### Option 1: 기존 Terraform 재사용 (권장)
현재 `infra/` 폴더의 Terraform 코드를 새 AWS 계정에 맞게 수정

### Option 2: 간소화된 인프라
개인 프로젝트에 맞는 단순한 구조로 재설계

## 📋 마이그레이션 단계별 계획

### Phase 1: 새 AWS 계정 준비
1. **AWS 계정 생성** 및 IAM 사용자 설정
2. **AWS CLI 구성** (새 계정 프로파일)
3. **Terraform 상태 초기화**

### Phase 2: DNS 연결 점검
1. **현재 DNS 설정** 확인 (Route 53 or 외부)
2. **새 인프라 준비 완료 후** DNS 레코드 변경
3. **TTL 시간** 고려한 전환 계획

### Phase 3: 인프라 구축
1. **Terraform 변수 업데이트**
2. **인프라 배포** (`terraform apply`)
3. **애플리케이션 배포** 및 테스트

### Phase 4: DNS 전환
1. **새 인프라 검증** 완료
2. **DNS A 레코드** 새 IP로 변경
3. **SSL 인증서** 새로 발급

## 🛠️ Terraform 수정 방안

### 현재 구조 분석
```
기존: t3.small + MySQL + Redis + HAProxy + Nginx
목적: 고가용성 로드밸런싱 환경
```

### 개인 프로젝트용 간소화 제안
```
새 구조: t2.micro + RDS MySQL + ElastiCache Redis (선택)
목적: 비용 최적화 + 관리 편의성
```

### 수정 필요 파일들
1. **variables.tf**: 새 계정용 변수들
2. **main.tf**: 인스턴스 타입, 보안그룹 등
3. **secrets.tf**: 새 패스워드 및 토큰들

## 💰 비용 최적화 고려사항

### 현재 비용 예상 (기존)
- **t3.small**: ~$15/월
- **MySQL (자체 관리)**: 무료
- **Redis (자체 관리)**: 무료
- **EBS 30GB**: ~$3/월
- **총 예상**: ~$18/월

### 최적화 옵션들
1. **t2.micro** (프리티어): $0~8/월
2. **RDS t3.micro**: ~$13/월 (관리형)
3. **ElastiCache** 생략: Redis 직접 설치

## 🔧 구체적 실행 계획

### 1단계: AWS 계정 설정
```bash
# 새 AWS CLI 프로파일 생성
aws configure --profile ddobang-new
# Region: ap-northeast-2 (서울)
# Output: json
```

### 2단계: Terraform 변수 수정
- `prefix`: "ddobang" 또는 개인 식별자
- `team_tag`: 개인 태그로 변경
- `app_1_domain`: "ddobang.site" 유지
- 패스워드들 새로 생성

### 3단계: 인프라 배포 테스트
```bash
# 새 계정으로 배포 테스트
cd DDOBANG_BE/infra
terraform init
terraform plan
# 검토 후
terraform apply
```

## 🎯 권장 마이그레이션 방법

### 최소 비용 + 최대 효율
1. **t2.micro** (프리티어 1년) 
2. **MySQL 컨테이너** (비용 절약)
3. **Redis 컨테이너** (비용 절약)
4. **단일 인스턴스** (HAProxy 제거)
5. **Nginx 직접 연결**

### 성능 대비 비용
- **월 예상 비용**: $3-5 (t2.micro + EBS)
- **성능**: 개인 프로젝트 충분
- **관리**: Docker Compose 활용

## 🚨 주의사항

1. **데이터 백업**: 기존 MySQL 데이터 백업 필요시
2. **SSL 인증서**: Let's Encrypt 새로 발급
3. **DNS 전환**: 점진적 전환으로 다운타임 최소화
4. **Github Registry**: 새 토큰 발급 필요

## 📝 다음 단계

어떤 방향으로 진행하시겠습니까?

1. **기존 구조 유지**: t3.small + 전체 인프라
2. **비용 최적화**: t2.micro + 컨테이너 기반
3. **완전 재설계**: ECS/EKS 등 모던 아키텍처

선택하시면 구체적인 Terraform 코드를 수정해드리겠습니다!