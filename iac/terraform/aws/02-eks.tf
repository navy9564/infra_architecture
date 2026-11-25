# -----------------------------------------------------------------------------
# 02-eks.tf : EKS 컨트롤 플레인 + 시스템 노드그룹 + 핵심 애드온
#   terraform-aws-modules/eks v21 (변수명에서 cluster_ 접두어가 제거됨)
#   - 애플리케이션 노드는 Karpenter(03-karpenter.tf)가 동적으로 프로비저닝
#   - 애드온 IAM 은 IRSA 대신 EKS Pod Identity 사용 (2026 권장)
# -----------------------------------------------------------------------------
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 21.0"

  name               = local.name
  kubernetes_version = var.kubernetes_version

  # API 엔드포인트: 운영은 private 만 열고 VPN/Bastion 경유 권장
  endpoint_public_access  = var.environment != "prd"
  endpoint_private_access = true

  enable_cluster_creator_admin_permissions = true
  authentication_mode                      = "API"

  vpc_id                   = module.vpc.vpc_id
  subnet_ids               = module.vpc.private_subnets
  control_plane_subnet_ids = module.vpc.intra_subnets

  enabled_log_types = ["api", "audit", "authenticator"]

  addons = {
    coredns = {}
    eks-pod-identity-agent = {
      before_compute = true
    }
    kube-proxy = {}
    vpc-cni = {
      before_compute = true
      configuration_values = jsonencode({
        env = {
          ENABLE_PREFIX_DELEGATION = "true" # 노드당 Pod 밀도 향상
          WARM_PREFIX_TARGET       = "1"
        }
      })
    }
    aws-ebs-csi-driver = {
      pod_identity_association = [{
        role_arn        = module.ebs_csi_pod_identity.iam_role_arn
        service_account = "ebs-csi-controller-sa"
      }]
    }
    metrics-server = {}
  }

  # 시스템 애드온(Karpenter, CoreDNS, Gateway 등) 전용 노드그룹 - Graviton
  eks_managed_node_groups = {
    system = {
      ami_type       = "AL2023_ARM_64_STANDARD"
      instance_types = var.system_node_instance_types
      min_size       = 2
      max_size       = 4
      desired_size   = 2

      labels = {
        "node-role/system" = "true"
      }
      taints = {
        system = {
          key    = "CriticalAddonsOnly"
          value  = "true"
          effect = "NO_SCHEDULE"
        }
      }
    }
  }

  access_entries = {
    for idx, arn in var.cluster_admin_arns : "admin-${idx}" => {
      principal_arn = arn
      policy_associations = {
        admin = {
          policy_arn = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
          access_scope = {
            type = "cluster"
          }
        }
      }
    }
  }

  node_security_group_tags = {
    "karpenter.sh/discovery" = local.name
  }

  tags = local.tags
}

module "ebs_csi_pod_identity" {
  source  = "terraform-aws-modules/eks-pod-identity/aws"
  version = "~> 2.0"

  name                      = "${local.name}-ebs-csi"
  attach_aws_ebs_csi_policy = true

  tags = local.tags
}

# gp3 를 기본 StorageClass 로 지정 (gp2 대비 저렴 + IOPS 독립 설정)
resource "kubernetes_storage_class_v1" "gp3" {
  metadata {
    name = "gp3"
    annotations = {
      "storageclass.kubernetes.io/is-default-class" = "true"
    }
  }

  storage_provisioner    = "ebs.csi.aws.com"
  reclaim_policy         = "Delete"
  volume_binding_mode    = "WaitForFirstConsumer"
  allow_volume_expansion = true

  parameters = {
    type      = "gp3"
    encrypted = "true"
  }

  depends_on = [module.eks]
}
