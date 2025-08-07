# AWS 리전
variable "region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-2"  # 서울 리전
}

# 프로젝트 접두사
variable "prefix" {
  description = "Prefix for all resources"
  type        = string
  default     = "ddobang"
}

# 도메인 이름
variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "ddobang.site"
}

# EC2 키 페어 이름 (사전에 AWS 콘솔에서 생성 필요)
variable "ec2_key_name" {
  description = "EC2 Key Pair name for SSH access"
  type        = string
  default     = "ddobang-key"  # AWS 콘솔에서 생성한 키 페어 이름
}

# SSH 프라이빗 키 경로
variable "private_key_path" {
  description = "Path to the private key file"
  type        = string
  default     = "~/.ssh/ddobang-key.pem"  # 로컬에 저장된 프라이빗 키 경로
}

# Elastic IP 사용 여부
variable "use_elastic_ip" {
  description = "Whether to use Elastic IP (recommended for production)"
  type        = bool
  default     = false  # 프리티어에서는 false 권장 (추가 비용 없음)
}

# 데이터베이스 정보
variable "db_name" {
  description = "Database name"
  type        = string
  default     = "ddobang"
}

variable "db_username" {
  description = "Database username"
  type        = string
  default     = "ddobang"
}

variable "db_password" {
  description = "Database password"
  type        = string
  default     = ""  # terraform.tfvars에서 설정
  sensitive   = true
}

# JWT 시크릿
variable "jwt_secret" {
  description = "JWT secret key"
  type        = string
  default     = ""  # terraform.tfvars에서 설정
  sensitive   = true
}

# 카카오 OAuth 설정
variable "kakao_client_id" {
  description = "Kakao OAuth Client ID"
  type        = string
  default     = ""
  sensitive   = true
}

variable "kakao_client_secret" {
  description = "Kakao OAuth Client Secret"
  type        = string
  default     = ""
  sensitive   = true
}

# 환경 태그
variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

# 추가 태그
variable "additional_tags" {
  description = "Additional tags for all resources"
  type        = map(string)
  default     = {}
}