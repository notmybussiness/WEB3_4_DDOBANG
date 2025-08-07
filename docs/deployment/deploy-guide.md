# AWS 프리티어 배포 가이드

## 🎯 배포 준비 체크리스트

### 1. AWS 계정 준비
- [ ] AWS 계정 생성 (신규 가입 시 1년 프리티어)
- [ ] AWS CLI 설치 및 설정
- [ ] IAM 사용자 생성 (AdministratorAccess 권한)

### 2. 로컬 환경 준비
- [ ] Terraform 설치 (v1.0+)
- [ ] Docker 설치 및 실행
- [ ] Git 저장소 클론

### 3. 인프라 배포 준비
- [ ] SSH 키 페어 생성
- [ ] 환경 변수 파일 설정
- [ ] Docker 이미지 빌드 및 레지스트리 등록

## 📋 단계별 배포 가이드

### Step 1: AWS CLI 설정

```bash
# AWS CLI 설치 (Windows)
# https://aws.amazon.com/cli/ 에서 다운로드

# 또는 pip으로 설치
pip install awscli

# AWS 계정 설정
aws configure
# AWS Access Key ID: [발급받은 액세스 키]
# AWS Secret Access Key: [발급받은 시크릿 키]
# Default region name: ap-northeast-2
# Default output format: json

# 설정 확인
aws sts get-caller-identity
```

### Step 2: SSH 키 페어 생성

```bash
# 로컬에서 SSH 키 생성
ssh-keygen -t rsa -b 2048 -f ~/.ssh/ddobang-key

# AWS 콘솔에서 키 페어 등록 방법:
# 1. EC2 콘솔 → Key Pairs → Import key pair
# 2. 키 이름: ddobang-key
# 3. Public key 내용: ~/.ssh/ddobang-key.pub 파일 내용 붙여넣기
```

### Step 3: 환경 변수 설정

```bash
cd DDOBANG_BE/infra

# terraform.tfvars 파일 생성
cp terraform.tfvars.example terraform.tfvars

# 다음 값들을 실제 값으로 수정:
# - db_password: 강력한 패스워드
# - jwt_secret: 긴 랜덤 문자열
# - kakao_client_id: 카카오 개발자 콘솔에서 발급
# - kakao_client_secret: 카카오 개발자 콘솔에서 발급
```

#### terraform.tfvars 설정 예시:
```hcl
region      = "ap-northeast-2"
prefix      = "ddobang"
domain_name = "ddobang.site"

ec2_key_name     = "ddobang-key"
private_key_path = "~/.ssh/ddobang-key"

db_name     = "ddobang"
db_username = "ddobang"
db_password = "YourSecurePassword123!"

jwt_secret = "dGVzdC1zZWNyZXQta2V5LWZvci1qd3QtdG9rZW4tZ2VuZXJhdGlvbi1hbmQtdmFsaWRhdGlvbi1wdXJwb3Nl"

kakao_client_id     = "your-kakao-client-id"
kakao_client_secret = "your-kakao-client-secret"

use_elastic_ip = false
environment    = "production"
```

### Step 4: Docker 이미지 준비

```bash
# 1. GitHub Container Registry에 로그인
echo "YOUR_GITHUB_TOKEN" | docker login ghcr.io -u YOUR_USERNAME --password-stdin

# 2. 백엔드 Docker 이미지 빌드
cd DDOBANG_BE
docker build -t ghcr.io/YOUR_USERNAME/ddobang-backend:latest .

# 3. 이미지 푸시
docker push ghcr.io/YOUR_USERNAME/ddobang-backend:latest

# 4. docker-compose.prod.yml의 이미지 경로 수정
# image: ghcr.io/YOUR_USERNAME/ddobang-backend:latest
```

### Step 5: 인프라 배포

```bash
cd DDOBANG_BE/infra

# Terraform 초기화
terraform init

# 배포 계획 확인
terraform plan -var-file="terraform.tfvars"

# 인프라 배포 실행
terraform apply -var-file="terraform.tfvars"

# 배포 완료 후 IP 주소 확인
terraform output instance_public_ip
```

### Step 6: 애플리케이션 배포

```bash
# EC2 인스턴스에 SSH 접속
ssh -i ~/.ssh/ddobang-key ec2-user@[EC2_PUBLIC_IP]

# 프로젝트 파일 업로드
scp -i ~/.ssh/ddobang-key docs/deployment/docker-compose.prod.yml ec2-user@[EC2_PUBLIC_IP]:~/
scp -i ~/.ssh/ddobang-key docs/deployment/nginx.conf ec2-user@[EC2_PUBLIC_IP]:~/
```

#### EC2 내부에서 실행:
```bash
# 환경 변수 파일 생성
cat > .env << EOF
DB_NAME=ddobang
DB_USERNAME=ddobang
DB_PASSWORD=YourSecurePassword123!
JWT_SECRET=dGVzdC1zZWNyZXQta2V5LWZvci1qd3QtdG9rZW4tZ2VuZXJhdGlvbi1hbmQtdmFsaWRhdGlvbi1wdXJwb3Nl
KAKAO_CLIENT_ID=your-kakao-client-id
KAKAO_CLIENT_SECRET=your-kakao-client-secret
DOMAIN_NAME=ddobang.site
EOF

# nginx 설정 디렉토리 생성
mkdir -p nginx/ssl nginx/logs

# nginx 설정 파일 배치
cp nginx.conf nginx/

# MySQL 설정 디렉토리 생성
mkdir -p mysql/conf.d

# MySQL 설정 파일 생성 (메모리 최적화)
cat > mysql/conf.d/mysql.cnf << EOF
[mysqld]
innodb_buffer_pool_size = 100M
max_connections = 50
query_cache_size = 20M
innodb_log_file_size = 32M
innodb_flush_log_at_trx_commit = 2
EOF

# 애플리케이션 실행
docker-compose -f docker-compose.prod.yml up -d

# 로그 확인
docker-compose -f docker-compose.prod.yml logs -f
```

### Step 7: SSL 인증서 설정

```bash
# Let's Encrypt 인증서 발급
docker-compose -f docker-compose.prod.yml --profile ssl-setup run certbot

# Nginx 재시작 (SSL 활성화)
docker-compose -f docker-compose.prod.yml restart nginx

# HTTPS 접속 테스트
curl -I https://ddobang.site
```

### Step 8: DNS 설정

현재 `ddobang.site` 도메인의 DNS 설정을 새 EC2 IP로 변경:

```bash
# 현재 EC2 IP 확인
terraform output instance_public_ip

# DNS A 레코드를 새 IP로 변경
# (Route 53 또는 현재 DNS 제공업체에서)
```

## 🔧 배포 후 확인사항

### 헬스체크
```bash
# 백엔드 상태 확인
curl https://ddobang.site/actuator/health

# SSE 연결 테스트
curl -N https://ddobang.site/api/v1/alarms/subscribe

# 메모리 사용량 확인
docker stats

# 로그 확인
docker-compose logs backend
docker-compose logs mysql
docker-compose logs rabbitmq
```

### 모니터링
```bash
# 시스템 리소스
htop
free -h
df -h

# Docker 컨테이너 상태
docker ps
docker stats

# 애플리케이션 로그
tail -f /var/log/nginx/access.log
```

## 🚨 트러블슈팅

### 메모리 부족 시
```bash
# 스왑 파일 확인
swapon --show

# 메모리 사용량 확인
free -h

# 컨테이너 메모리 제한 확인
docker stats
```

### 컨테이너 재시작
```bash
# 전체 재시작
docker-compose -f docker-compose.prod.yml restart

# 개별 서비스 재시작
docker-compose -f docker-compose.prod.yml restart backend
```

### SSL 인증서 문제
```bash
# 인증서 상태 확인
docker-compose -f docker-compose.prod.yml --profile ssl-setup run certbot certificates

# 인증서 갱신
docker-compose -f docker-compose.prod.yml --profile ssl-setup run certbot renew
```

### 데이터베이스 문제
```bash
# MySQL 접속 테스트
docker exec -it ddobang-mysql mysql -u ddobang -p

# 데이터베이스 상태 확인
docker exec ddobang-mysql mysqladmin status -u root -p
```

## 💰 비용 모니터링

### 프리티어 사용량 확인
- AWS Billing Dashboard
- AWS Free Tier 사용량 알림 설정
- CloudWatch 메트릭 확인

### 예상 비용 (프리티어 이후)
- EC2 t2.micro: ~$8.5/월
- EBS 8GB: ~$0.8/월  
- 데이터 전송: ~$1.35/월 (15GB 기준)
- **총 예상**: ~$10.7/월

## 🔄 업데이트 및 유지보수

### 애플리케이션 업데이트
```bash
# 새 이미지 빌드 & 푸시
docker build -t ghcr.io/YOUR_USERNAME/ddobang-backend:latest .
docker push ghcr.io/YOUR_USERNAME/ddobang-backend:latest

# EC2에서 업데이트
docker-compose -f docker-compose.prod.yml pull backend
docker-compose -f docker-compose.prod.yml up -d backend
```

### 백업
```bash
# 데이터베이스 백업
docker exec ddobang-mysql mysqldump -u root -p ddobang > backup_$(date +%Y%m%d).sql

# 설정 파일 백업
tar -czf config_backup_$(date +%Y%m%d).tar.gz nginx/ mysql/ .env
```

이제 프리티어로 DDOBANG을 완전히 배포할 준비가 되었습니다! 🚀