locals {
  name = "${var.project}-${var.environment}"

  azs = slice(data.aws_availability_zones.available.names, 0, 3)

  tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
    Repository  = "github.com/navy9564/infra_architecture"
  }

  # chart_versions 에 값이 없으면 null(=최신) 로 처리
  v = { for k in [
    "aws-load-balancer-controller", "karpenter", "gateway-helm", "istio", "cert-manager",
    "external-secrets", "kube-prometheus-stack", "loki", "alloy", "opentelemetry-operator",
    "argo-cd", "kyverno", "cloudnative-pg", "strimzi-kafka-operator", "valkey"
  ] : k => lookup(var.chart_versions, k, null) }
}

data "aws_availability_zones" "available" {
  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

data "aws_caller_identity" "current" {}
