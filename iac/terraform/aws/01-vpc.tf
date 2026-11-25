# -----------------------------------------------------------------------------
# 01-vpc.tf : 3-AZ, 3-Tier 서브넷 (public / private-app / intra-data)
#   public  : ALB/NLB, NAT Gateway
#   private : EKS 노드, Pod (Karpenter discovery 태그)
#   intra   : RDS/ElastiCache/MSK 등 데이터 계층 (인터넷 경로 없음)
# -----------------------------------------------------------------------------
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 6.0"

  name = local.name
  cidr = var.vpc_cidr
  azs  = local.azs

  public_subnets  = [for i, _ in local.azs : cidrsubnet(var.vpc_cidr, 8, i)]
  private_subnets = [for i, _ in local.azs : cidrsubnet(var.vpc_cidr, 4, i + 1)]
  intra_subnets   = [for i, _ in local.azs : cidrsubnet(var.vpc_cidr, 8, i + 100)]

  enable_nat_gateway     = true
  single_nat_gateway     = var.environment != "prd" # 운영은 AZ별 NAT
  one_nat_gateway_per_az = var.environment == "prd"

  enable_dns_hostnames = true
  enable_dns_support   = true

  public_subnet_tags = {
    "kubernetes.io/role/elb" = 1
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = 1
    "karpenter.sh/discovery"          = local.name
  }

  tags = local.tags
}
