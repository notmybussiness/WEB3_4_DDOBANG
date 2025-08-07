# AWS 프리티어 최적화 배포 계획

## 🆓 AWS 프리티어 혜택 (신규 가입 1년)

### 무료 사용 가능 서비스
- **EC2**: t2.micro 인스턴스 750시간/월 (24시간 운영 가능)
- **EBS**: 30GB General Purpose SSD
- **RDS**: t2.micro 데이터베이스 750시간/월 (선택사항)
- **데이터 전송**: 15GB/월 아웃바운드
- **Route 53**: 호스팅 존 1개 (월 $0.50, 거의 무료)

## 🎯 프리티어 최적화 아키텍처

### 권장 구성: 단일 EC2 + Docker Compose
```
┌─────────────────────────────────────┐
│            EC2 t2.micro             │
│  ┌─────────────────────────────────┐ │
│  │        Docker Compose          │ │
│  │  ┌──────────────────────────┐   │ │
│  │  │    DDOBANG Backend       │   │ │  
│  │  │   (Spring Boot + SSE)    │   │ │
│  │  └──────────────────────────┘   │ │
│  │  ┌──────────────────────────┐   │ │
│  │  │      RabbitMQ           │   │ │
│  │  └──────────────────────────┘   │ │
│  │  ┌──────────────────────────┐   │ │
│  │  │       MySQL             │   │ │
│  │  └──────────────────────────┘   │ │
│  │  ┌──────────────────────────┐   │ │
│  │  │    Nginx (SSL/Proxy)    │   │ │
│  │  └──────────────────────────┘   │ │
│  └─────────────────────────────────┘ │
└─────────────────────────────────────┘
         ↓ (ddobang.site)
      사용자 접속
```

### 메모리 최적화 (1GB 환경)
- **Backend**: 400MB (이미 최적화됨)
- **RabbitMQ**: 200MB
- **MySQL**: 200MB  
- **Nginx**: 50MB
- **System**: 150MB
- **여유**: 총 1GB 안에서 운영

## 🛠️ 프리티어용 Terraform 설정

### 1. 간소화된 main.tf
```hcl
# t2.micro + 최소 구성
resource "aws_instance" "ddobang_server" {
  ami           = data.aws_ami.latest_amazon_linux.id
  instance_type = "t2.micro"  # 프리티어
  
  vpc_security_group_ids = [aws_security_group.ddobang_sg.id]
  subnet_id             = aws_subnet.public_subnet.id
  
  associate_public_ip_address = true
  
  root_block_device {
    volume_type = "gp2"    # gp2가 프리티어 대상
    volume_size = 8        # 30GB 중 8GB만 사용 (여유분 확보)
  }
  
  user_data = local.docker_setup_script
  
  tags = {
    Name = "ddobang-free-tier"
  }
}
```

### 2. 보안그룹 최소화
```hcl
resource "aws_security_group" "ddobang_sg" {
  name        = "ddobang-free-tier-sg"
  description = "DDOBANG Free Tier Security Group"
  vpc_id      = aws_vpc.main.id

  # HTTP
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS  
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # SSH (관리용)
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # 실제로는 본인 IP로 제한 권장
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

## 🐳 프리티어용 Docker Compose

### docker-compose.prod.yml
```yaml
version: '3.8'

services:
  # DDOBANG Backend
  backend:
    image: your-registry/ddobang-backend:latest
    container_name: ddobang-backend
    restart: unless-stopped
    environment:
      # 프리티어 메모리 최적화 JVM 설정
      - JAVA_OPTS=-Xms128m -Xmx400m -XX:+UseG1GC -XX:MaxGCPauseMillis=200
      
      # Database
      - SPRING_DATASOURCE_URL=jdbc:mysql://mysql:3306/ddobang?useSSL=false
      - SPRING_DATASOURCE_USERNAME=ddobang
      - SPRING_DATASOURCE_PASSWORD=${DB_PASSWORD}
      
      # RabbitMQ
      - SPRING_RABBITMQ_HOST=rabbitmq
      - SPRING_RABBITMQ_USERNAME=guest
      - SPRING_RABBITMQ_PASSWORD=guest
      
      # JWT
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - mysql
      - rabbitmq
    networks:
      - ddobang-network

  # MySQL
  mysql:
    image: mysql:8.0
    container_name: ddobang-mysql
    restart: unless-stopped
    environment:
      - MYSQL_ROOT_PASSWORD=${DB_PASSWORD}
      - MYSQL_DATABASE=ddobang
      - MYSQL_USER=ddobang  
      - MYSQL_PASSWORD=${DB_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
    networks:
      - ddobang-network
    # 메모리 제한 (200MB)
    deploy:
      resources:
        limits:
          memory: 200M

  # RabbitMQ
  rabbitmq:
    image: rabbitmq:3.12-management-alpine
    container_name: ddobang-rabbitmq
    restart: unless-stopped
    environment:
      - RABBITMQ_DEFAULT_USER=guest
      - RABBITMQ_DEFAULT_PASS=guest
      - RABBITMQ_VM_MEMORY_HIGH_WATERMARK=150MB
    networks:
      - ddobang-network
    # 메모리 제한 (200MB)  
    deploy:
      resources:
        limits:
          memory: 200M

  # Nginx (SSL + Proxy)
  nginx:
    image: nginx:alpine
    container_name: ddobang-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - certbot_data:/var/www/certbot
    depends_on:
      - backend
    networks:
      - ddobang-network

  # Let's Encrypt SSL 인증서
  certbot:
    image: certbot/certbot
    container_name: ddobang-certbot
    volumes:
      - certbot_data:/var/www/certbot
      - ./nginx/ssl:/etc/letsencrypt
    profiles:
      - ssl-setup

volumes:
  mysql_data:
  certbot_data:

networks:
  ddobang-network:
    driver: bridge
```

## 📋 배포 단계별 가이드

### 1단계: AWS 계정 및 CLI 설정
```bash
# 새 AWS 계정 생성 후
aws configure --profile ddobang-free
# 리전: ap-northeast-2 (서울)
```

### 2단계: 환경 변수 파일 생성
```bash
# .env 파일 생성
cat > .env << EOF
DB_PASSWORD=your-secure-password-here
JWT_SECRET=dGVzdC1zZWNyZXQta2V5LWZvci1qd3QtdG9rZW4tZ2VuZXJhdGlvbi1hbmQtdmFsaWRhdGlvbi1wdXJwb3Nl
EOF
```

### 3단계: Terraform 인프라 배포
```bash
cd DDOBANG_BE/infra
# 프리티어용 변수 파일 준비
terraform init
terraform plan -var-file="free-tier.tfvars"
terraform apply -var-file="free-tier.tfvars"
```

### 4단계: Docker 애플리케이션 배포
```bash
# EC2에 SSH 접속 후
ssh ec2-user@your-ec2-ip

# Docker Compose 설정
scp docker-compose.prod.yml ec2-user@your-ec2-ip:~/
scp .env ec2-user@your-ec2-ip:~/

# 애플리케이션 실행
docker-compose -f docker-compose.prod.yml up -d
```

### 5단계: SSL 인증서 설정
```bash
# Let's Encrypt 인증서 발급
docker-compose --profile ssl-setup run certbot certonly \
  --webroot --webroot-path=/var/www/certbot \
  -d ddobang.site

# Nginx SSL 설정 활성화 후 재시작
docker-compose restart nginx
```

## 💰 프리티어 비용 계산

### 완전 무료 (1년간)
- **EC2 t2.micro**: 750시간/월 (무료)
- **EBS 8GB**: 30GB 한도 내 (무료)
- **데이터 전송**: 15GB/월 한도 내 (무료)
- **예상 월비용**: $0

### 프리티어 이후 (13개월부터)
- **EC2 t2.micro**: ~$8.5/월
- **EBS 8GB**: ~$0.8/월
- **데이터 전송**: ~$1.35/월 (15GB)
- **예상 월비용**: ~$10.7/월

## 🚨 프리티어 주의사항

1. **인스턴스 수**: t2.micro 1개만 무료
2. **EBS 용량**: 30GB 초과 시 과금
3. **데이터 전송**: 15GB 초과 시 과금
4. **RDS 미사용**: MySQL 컨테이너로 대체
5. **모니터링**: CloudWatch 기본 메트릭만 무료

## 🎯 성능 최적화 (1GB 메모리)

### JVM 튜닝
```bash
# 이미 적용된 최적화
-Xms128m -Xmx400m -XX:+UseG1GC -XX:MaxGCPauseMillis=200
```

### MySQL 튜닝
```sql
# my.cnf 설정
[mysqld]
innodb_buffer_pool_size = 100M
max_connections = 50
query_cache_size = 20M
```

### RabbitMQ 튜닝
```bash
# 메모리 제한
RABBITMQ_VM_MEMORY_HIGH_WATERMARK=150MB
```

## ✅ 다음 단계

프리티어 최적화 Terraform 코드를 생성할까요?

1. **프리티어 variables.tf** 생성
2. **간소화된 main.tf** 작성  
3. **Docker Compose 설정** 준비
4. **배포 스크립트** 작성

준비되시면 바로 시작하겠습니다! 🚀