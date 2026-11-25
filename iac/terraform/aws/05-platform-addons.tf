# -----------------------------------------------------------------------------
# 05-platform-addons.tf
#   "Infrastructure and Platform Services" 계층을 Helm 으로 설치한다.
#   - 상세 values 는 helm/values/*.yaml 을 그대로 재사용 (Helm/Terraform/Ansible 공통)
#   - 순서가 중요한 Istio(ambient)는 개별 리소스로, 나머지는 for_each 로 관리
#   - GitOps 로 전환할 경우: argocd 만 Terraform 으로 설치하고
#     나머지는 helm/argocd/root-app.yaml(App of Apps)로 위임
# -----------------------------------------------------------------------------
locals {
  values_dir = "${path.module}/../../../helm/values"

  platform_charts = {
    envoy-gateway = {
      enabled    = var.addons["envoy_gateway"]
      namespace  = "envoy-gateway-system"
      repository = "oci://docker.io/envoyproxy"
      chart      = "gateway-helm"
      version    = local.v["gateway-helm"]
      values     = "envoy-gateway.yaml"
    }
    cert-manager = {
      enabled    = var.addons["cert_manager"]
      namespace  = "cert-manager"
      repository = "https://charts.jetstack.io"
      chart      = "cert-manager"
      version    = local.v["cert-manager"]
      values     = "cert-manager.yaml"
    }
    external-secrets = {
      enabled    = var.addons["external_secrets"]
      namespace  = "external-secrets"
      repository = "https://charts.external-secrets.io"
      chart      = "external-secrets"
      version    = local.v["external-secrets"]
      values     = "external-secrets.yaml"
    }
    kube-prometheus-stack = {
      enabled    = var.addons["kube_prometheus_stack"]
      namespace  = "monitoring"
      repository = "https://prometheus-community.github.io/helm-charts"
      chart      = "kube-prometheus-stack"
      version    = local.v["kube-prometheus-stack"]
      values     = "kube-prometheus-stack.yaml"
    }
    loki = {
      enabled    = var.addons["loki"]
      namespace  = "logging"
      repository = "https://grafana.github.io/helm-charts"
      chart      = "loki"
      version    = local.v["loki"]
      values     = "loki.yaml"
    }
    alloy = {
      enabled    = var.addons["alloy"]
      namespace  = "logging"
      repository = "https://grafana.github.io/helm-charts"
      chart      = "alloy"
      version    = local.v["alloy"]
      values     = "alloy.yaml"
    }
    opentelemetry-operator = {
      enabled    = var.addons["opentelemetry_operator"]
      namespace  = "opentelemetry"
      repository = "https://open-telemetry.github.io/opentelemetry-helm-charts"
      chart      = "opentelemetry-operator"
      version    = local.v["opentelemetry-operator"]
      values     = "opentelemetry-operator.yaml"
    }
    argo-cd = {
      enabled    = var.addons["argocd"]
      namespace  = "argocd"
      repository = "https://argoproj.github.io/argo-helm"
      chart      = "argo-cd"
      version    = local.v["argo-cd"]
      values     = "argo-cd.yaml"
    }
    kyverno = {
      enabled    = var.addons["kyverno"]
      namespace  = "kyverno"
      repository = "https://kyverno.github.io/kyverno/"
      chart      = "kyverno"
      version    = local.v["kyverno"]
      values     = "kyverno.yaml"
    }
    cloudnative-pg = {
      enabled    = var.addons["cloudnative_pg"]
      namespace  = "cnpg-system"
      repository = "https://cloudnative-pg.github.io/charts"
      chart      = "cloudnative-pg"
      version    = local.v["cloudnative-pg"]
      values     = "cloudnative-pg.yaml"
    }
    strimzi = {
      enabled    = var.addons["strimzi"]
      namespace  = "kafka"
      repository = "https://strimzi.io/charts/"
      chart      = "strimzi-kafka-operator"
      version    = local.v["strimzi-kafka-operator"]
      values     = "strimzi.yaml"
    }
    valkey = {
      enabled    = var.addons["valkey"]
      namespace  = "cache"
      repository = "https://valkey.io/valkey-helm/"
      chart      = "valkey"
      version    = local.v["valkey"]
      values     = "valkey.yaml"
    }
  }

  enabled_platform_charts = { for k, c in local.platform_charts : k => c if c.enabled }
}

resource "helm_release" "platform" {
  for_each = local.enabled_platform_charts

  name             = each.key
  namespace        = each.value.namespace
  create_namespace = true
  repository       = each.value.repository
  chart            = each.value.chart
  version          = each.value.version
  wait             = true
  timeout          = 900

  values = [file("${local.values_dir}/${each.value.values}")]

  # 노드(Karpenter)와 LB 컨트롤러가 먼저 준비되어야 PVC/Service 가 정상 생성된다.
  depends_on = [
    helm_release.karpenter,
    helm_release.aws_load_balancer_controller,
    kubernetes_storage_class_v1.gp3,
  ]
}

# ---------------------------- Istio (ambient mode) ----------------------------
# 설치 순서: base(CRD) -> istiod -> cni -> ztunnel
#   Istio 1.31 부터 차트는 blob.istio.io / ghcr.io(OCI) 에서만 배포된다.
locals {
  istio_repo    = "oci://ghcr.io/istio/release/charts"
  istio_enabled = var.addons["istio_ambient"] ? 1 : 0
}

resource "helm_release" "istio_base" {
  count            = local.istio_enabled
  name             = "istio-base"
  namespace        = "istio-system"
  create_namespace = true
  repository       = local.istio_repo
  chart            = "base"
  version          = local.v["istio"]
  depends_on       = [helm_release.platform] # Gateway API CRD(Envoy Gateway) 이후
}

resource "helm_release" "istiod" {
  count      = local.istio_enabled
  name       = "istiod"
  namespace  = "istio-system"
  repository = local.istio_repo
  chart      = "istiod"
  version    = local.v["istio"]
  wait       = true
  values     = [file("${local.values_dir}/istio-istiod.yaml")]
  depends_on = [helm_release.istio_base]
}

resource "helm_release" "istio_cni" {
  count      = local.istio_enabled
  name       = "istio-cni"
  namespace  = "istio-system"
  repository = local.istio_repo
  chart      = "cni"
  version    = local.v["istio"]
  wait       = true
  values     = [file("${local.values_dir}/istio-cni.yaml")]
  depends_on = [helm_release.istiod]
}

resource "helm_release" "ztunnel" {
  count      = local.istio_enabled
  name       = "ztunnel"
  namespace  = "istio-system"
  repository = local.istio_repo
  chart      = "ztunnel"
  version    = local.v["istio"]
  wait       = true
  depends_on = [helm_release.istio_cni]
}
