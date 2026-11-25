# -----------------------------------------------------------------------------
# 03-karpenter.tf : 애플리케이션 노드 자동 프로비저닝 (Cluster Autoscaler 대체)
# -----------------------------------------------------------------------------
module "karpenter" {
  count   = var.addons["karpenter"] ? 1 : 0
  source  = "terraform-aws-modules/eks/aws//modules/karpenter"
  version = "~> 21.0"

  cluster_name = module.eks.cluster_name

  # v21: Karpenter 컨트롤러 IAM 은 Pod Identity 로 연결
  create_pod_identity_association = true

  node_iam_role_additional_policies = {
    AmazonSSMManagedInstanceCore = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
  }

  tags = local.tags
}

resource "helm_release" "karpenter" {
  count = var.addons["karpenter"] ? 1 : 0

  name             = "karpenter"
  namespace        = "kube-system"
  repository       = "oci://public.ecr.aws/karpenter"
  chart            = "karpenter"
  version          = local.v["karpenter"]
  create_namespace = false
  wait             = true

  values = [yamlencode({
    settings = {
      clusterName       = module.eks.cluster_name
      clusterEndpoint   = module.eks.cluster_endpoint
      interruptionQueue = module.karpenter[0].queue_name
    }
    nodeSelector = { "node-role/system" = "true" }
    tolerations = [{
      key      = "CriticalAddonsOnly"
      operator = "Exists"
      effect   = "NoSchedule"
    }]
    controller = {
      resources = {
        requests = { cpu = "250m", memory = "512Mi" }
        limits   = { memory = "1Gi" }
      }
    }
  })]

  depends_on = [module.eks]
}

# NodePool / EC2NodeClass 는 CRD 설치 이후 적용되어야 하므로 별도 매니페스트로 관리
#   -> helm/manifests/karpenter-nodepool.yaml (kubectl apply 또는 Argo CD 로 배포)
