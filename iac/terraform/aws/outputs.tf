output "cluster_name" {
  value = module.eks.cluster_name
}

output "cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "configure_kubectl" {
  description = "kubeconfig 설정 명령"
  value       = "aws eks update-kubeconfig --region ${var.region} --name ${module.eks.cluster_name}"
}

output "vpc_id" {
  value = module.vpc.vpc_id
}

output "ecr_repositories" {
  value = { for k, r in aws_ecr_repository.svc : k => r.repository_url }
}

output "github_actions_role_arn" {
  value = aws_iam_role.github_ecr_push.arn
}

output "aurora_endpoint" {
  value = var.use_managed_postgres ? module.aurora[0].cluster_endpoint : null
}

output "aurora_master_secret_arn" {
  value = var.use_managed_postgres ? module.aurora[0].cluster_master_user_secret[0].secret_arn : null
}

output "valkey_primary_endpoint" {
  value = var.use_managed_valkey ? aws_elasticache_replication_group.valkey[0].primary_endpoint_address : null
}

output "msk_bootstrap_brokers_iam" {
  value = var.use_managed_kafka ? aws_msk_cluster.kafka[0].bootstrap_brokers_sasl_iam : null
}

output "rabbitmq_endpoints" {
  value = var.use_managed_rabbitmq ? aws_mq_broker.rabbitmq[0].instances[*].endpoints : null
}

output "acm_certificate_arn" {
  value = var.domain_name != "" ? aws_acm_certificate_validation.this[0].certificate_arn : null
}
