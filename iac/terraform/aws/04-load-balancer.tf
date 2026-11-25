# -----------------------------------------------------------------------------
# 04-load-balancer.tf
#   AWS Load Balancer Controller : Service(type=LoadBalancer) -> NLB 자동 생성
#   Envoy Gateway 의 데이터플레인 Service 에 NLB 어노테이션을 주면
#   [Client] -> NLB(L4, TLS 패스스루 또는 종료) -> Envoy Gateway(L7) 구조가 된다.
# -----------------------------------------------------------------------------
module "aws_lb_controller_pod_identity" {
  count   = var.addons["aws_load_balancer_controller"] ? 1 : 0
  source  = "terraform-aws-modules/eks-pod-identity/aws"
  version = "~> 2.0"

  name                            = "${local.name}-aws-lbc"
  attach_aws_lb_controller_policy = true

  associations = {
    this = {
      cluster_arn     = module.eks.cluster_arn
      namespace       = "kube-system"
      service_account = "aws-load-balancer-controller"
    }
  }

  tags = local.tags
}

resource "helm_release" "aws_load_balancer_controller" {
  count = var.addons["aws_load_balancer_controller"] ? 1 : 0

  name       = "aws-load-balancer-controller"
  namespace  = "kube-system"
  repository = "https://aws.github.io/eks-charts"
  chart      = "aws-load-balancer-controller"
  version    = local.v["aws-load-balancer-controller"]
  wait       = true

  values = [yamlencode({
    clusterName = module.eks.cluster_name
    region      = var.region
    vpcId       = module.vpc.vpc_id
    serviceAccount = {
      create = true
      name   = "aws-load-balancer-controller"
    }
    nodeSelector = { "node-role/system" = "true" }
    tolerations = [{
      key      = "CriticalAddonsOnly"
      operator = "Exists"
      effect   = "NoSchedule"
    }]
  })]

  depends_on = [module.eks, module.aws_lb_controller_pod_identity]
}

# ---- (선택) 도메인 인증서: ACM + Route53 DNS 검증 ----
resource "aws_acm_certificate" "this" {
  count             = var.domain_name != "" ? 1 : 0
  domain_name       = var.domain_name
  validation_method = "DNS"

  subject_alternative_names = ["*.${var.domain_name}"]

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "acm_validation" {
  for_each = var.domain_name != "" ? {
    for dvo in aws_acm_certificate.this[0].domain_validation_options : dvo.domain_name => dvo
  } : {}

  zone_id         = var.route53_zone_id
  name            = each.value.resource_record_name
  type            = each.value.resource_record_type
  records         = [each.value.resource_record_value]
  ttl             = 60
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "this" {
  count                   = var.domain_name != "" ? 1 : 0
  certificate_arn         = aws_acm_certificate.this[0].arn
  validation_record_fqdns = [for r in aws_route53_record.acm_validation : r.fqdn]
}
