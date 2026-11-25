# -----------------------------------------------------------------------------
# variables.tf : 프로젝트마다 바뀌는 값은 모두 여기서 관리한다.
# -----------------------------------------------------------------------------
variable "project" {
  description = "프로젝트 식별자 (리소스 이름 prefix)"
  type        = string
  default     = "stdarch"
}

variable "environment" {
  description = "환경 구분 (dev / stg / prd)"
  type        = string
  default     = "dev"
}

variable "region" {
  description = "AWS 리전"
  type        = string
  default     = "ap-northeast-2"
}

variable "vpc_cidr" {
  description = "VPC CIDR (/16 권장: 서브넷당 IP 고갈 방지)"
  type        = string
  default     = "10.10.0.0/16"
}

variable "kubernetes_version" {
  description = "EKS Kubernetes 버전 (표준지원 기간 내 버전 사용)"
  type        = string
  default     = "1.36"
}

variable "system_node_instance_types" {
  description = "시스템(애드온) 전용 관리형 노드그룹 인스턴스 타입"
  type        = list(string)
  default     = ["m7g.large"]
}

variable "cluster_admin_arns" {
  description = "클러스터 관리자 권한을 부여할 IAM Role/User ARN 목록"
  type        = list(string)
  default     = []
}

variable "domain_name" {
  description = "서비스 도메인 (예: shop.example.com). 비워두면 ACM/Route53 생성 생략"
  type        = string
  default     = ""
}

variable "route53_zone_id" {
  description = "domain_name 이 속한 Route53 Hosted Zone ID"
  type        = string
  default     = ""
}

variable "microservices" {
  description = "ECR 리포지토리를 생성할 마이크로서비스 목록"
  type        = list(string)
  default     = ["identity", "product-catalog", "order", "inventory", "payment", "shipping", "notification-worker", "email-worker"]
}

# ---- 데이터 계층: AWS 관리형 서비스 사용 여부 (false 이면 클러스터 내부 Operator 사용) ----
variable "use_managed_postgres" {
  description = "Aurora PostgreSQL 사용 여부"
  type        = bool
  default     = true
}

variable "use_managed_valkey" {
  description = "ElastiCache for Valkey 사용 여부"
  type        = bool
  default     = true
}

variable "use_managed_kafka" {
  description = "Amazon MSK 사용 여부"
  type        = bool
  default     = false
}

variable "use_managed_rabbitmq" {
  description = "Amazon MQ for RabbitMQ 사용 여부"
  type        = bool
  default     = false
}

# ---- 플랫폼 애드온 on/off ----
variable "addons" {
  description = "Helm 으로 설치할 플랫폼 애드온 활성화 여부"
  type        = map(bool)
  default = {
    aws_load_balancer_controller = true
    karpenter                    = true
    envoy_gateway                = true
    istio_ambient                = true
    cert_manager                 = true
    external_secrets             = true
    kube_prometheus_stack        = true
    loki                         = true
    alloy                        = true
    opentelemetry_operator       = true
    argocd                       = true
    kyverno                      = true
    cloudnative_pg               = false
    strimzi                      = true
    valkey                       = false
  }
}

variable "chart_versions" {
  description = <<-EOT
    Helm 차트 버전 고정값. 키가 없거나 null 이면 최신 버전을 설치한다.
    운영(prd) 환경에서는 'helm search repo <repo>/<chart> -l' 로 검증한 버전을 반드시 고정할 것.
  EOT
  type        = map(string)
  default     = {}
}
