terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

# 최신 Amazon Linux 2023 AMI 조회 (프리티어 호환)
data "aws_ami" "latest_amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  filter {
    name   = "root-device-type"
    values = ["ebs"]
  }
}

# VPC 설정
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.prefix}-vpc"
  }
}

# 인터넷 게이트웨이
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.prefix}-igw"
  }
}

# 퍼블릭 서브넷
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "${var.region}a"
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.prefix}-public-subnet"
  }
}

# 라우팅 테이블
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${var.prefix}-public-rt"
  }
}

# 라우팅 테이블 연결
resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# 보안 그룹
resource "aws_security_group" "ddobang_sg" {
  name_prefix = "${var.prefix}-sg"
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

  # SSH (관리용 - 실제로는 본인 IP로 제한 권장)
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # 개발용 포트 (선택사항)
  ingress {
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.prefix}-security-group"
  }
}

# EC2 역할 (S3, SSM 접근용)
resource "aws_iam_role" "ec2_role" {
  name = "${var.prefix}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.prefix}-ec2-role"
  }
}

# EC2 역할에 기본 정책 연결
resource "aws_iam_role_policy_attachment" "ssm_managed" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# IAM 인스턴스 프로파일
resource "aws_iam_instance_profile" "ec2_profile" {
  name = "${var.prefix}-ec2-profile"
  role = aws_iam_role.ec2_role.name

  tags = {
    Name = "${var.prefix}-ec2-profile"
  }
}

# User Data 스크립트 (Docker 환경 설정)
locals {
  user_data = <<-EOF
#!/bin/bash

# 시스템 업데이트
yum update -y

# Docker 설치
yum install -y docker
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

# Docker Compose 설치
curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose

# 스왑 파일 생성 (메모리 부족 방지)
dd if=/dev/zero of=/swapfile bs=1M count=1024
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile swap swap defaults 0 0' >> /etc/fstab

# 프로젝트 디렉토리 생성
mkdir -p /home/ec2-user/ddobang
chown ec2-user:ec2-user /home/ec2-user/ddobang

# 방화벽 설정 (필요시)
# systemctl start firewalld
# systemctl enable firewalld
# firewall-cmd --permanent --add-port=80/tcp
# firewall-cmd --permanent --add-port=443/tcp
# firewall-cmd --reload

# 로그 확인용
echo "User data script completed at $(date)" >> /var/log/user-data.log

EOF
}

# EC2 인스턴스 (프리티어 t2.micro)
resource "aws_instance" "ddobang_server" {
  ami                     = data.aws_ami.latest_amazon_linux.id
  instance_type          = "t2.micro"  # 프리티어 무료
  key_name               = var.ec2_key_name  # SSH 키 페어 (사전 생성 필요)
  vpc_security_group_ids = [aws_security_group.ddobang_sg.id]
  subnet_id              = aws_subnet.public.id
  iam_instance_profile   = aws_iam_instance_profile.ec2_profile.name

  associate_public_ip_address = true

  # 프리티어 EBS 설정 (30GB 한도 내)
  root_block_device {
    volume_type           = "gp2"  # gp2가 프리티어 대상
    volume_size          = 8     # 8GB (여유분 확보)
    delete_on_termination = true
  }

  user_data = base64encode(local.user_data)

  tags = {
    Name = "${var.prefix}-server"
  }

  # 인스턴스 생성 후 Docker 설치 완료까지 대기
  provisioner "remote-exec" {
    inline = [
      "echo 'Waiting for cloud-init to complete...'",
      "cloud-init status --wait",
      "echo 'Cloud-init completed'"
    ]

    connection {
      type        = "ssh"
      host        = self.public_ip
      user        = "ec2-user"
      private_key = file(var.private_key_path)
      timeout     = "10m"
    }
  }
}

# Elastic IP (선택사항 - 고정 IP 필요시)
resource "aws_eip" "ddobang_eip" {
  count    = var.use_elastic_ip ? 1 : 0
  instance = aws_instance.ddobang_server.id
  domain   = "vpc"

  tags = {
    Name = "${var.prefix}-eip"
  }
}

# 출력 정보
output "instance_id" {
  description = "EC2 Instance ID"
  value       = aws_instance.ddobang_server.id
}

output "instance_public_ip" {
  description = "EC2 Instance Public IP"
  value       = var.use_elastic_ip ? aws_eip.ddobang_eip[0].public_ip : aws_instance.ddobang_server.public_ip
}

output "instance_public_dns" {
  description = "EC2 Instance Public DNS"
  value       = aws_instance.ddobang_server.public_dns
}

output "ssh_connection_command" {
  description = "SSH Connection Command"
  value       = "ssh -i ${var.private_key_path} ec2-user@${var.use_elastic_ip ? aws_eip.ddobang_eip[0].public_ip : aws_instance.ddobang_server.public_ip}"
}