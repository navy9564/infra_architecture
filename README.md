# 표준 인프라 아키텍처 가이드 (2026 Edition)

> SI 프로젝트에서 반복적으로 작성하는 **프로덕션 마이크로서비스 인프라 아키텍처**를
> 웹 기반 표준 구성도 + 구성요소별 가이드 + **설치 자동화(Terraform · Ansible · Helm)** 로 정리한 저장소입니다.

인프라 환경(Legacy On-Premise / Private Cloud / Public Cloud)은 달라도 아키텍처의 골격(Edge → L4 → L7 Gateway → Mesh → Service → Data → Platform)은 같다는 전제에서,
**역할은 고정하고 구현체만 환경별로 교체**하는 방식으로 설계했습니다.

## 보는 방법

| 방법 | 설명 |
|---|---|
| 로컬 | `index.html` 을 브라우저로 바로 열기 (빌드·서버 불필요) |
| GitHub Pages | Settings → Pages → Source 를 **GitHub Actions** 로 지정하면 `.github/workflows/pages.yml` 이 자동 배포 |

## 문서 구성 (목차)

0. 목차
1. **표준 아키텍처 구성도** — 박스를 클릭하면 해당 구성요소 상세로 이동
2. 아키텍처 개요 · 설계 원칙 · 주문 요청 End-to-End 10단계
3. 인프라 환경별 매핑 (On-Prem / Private / AWS / Azure / GCP)
4. 구성요소 상세 (17개) — 역할 · 2026 트렌드 · 대표 솔루션(CNCF 성숙도) · 권장안 · 설치 가이드 3종
   - `설치방법 - AWS환경에서 IaC[Terraform]로의 설치`
   - `설치방법 - On-Premise환경에서 IaC[Ansible]로의 설치`
   - `설치방법 - Kubernetes환경에서 Helm으로의 설치`
5. 구축 로드맵 (Phase 0 ~ 6)
6. 부록 — 버전 기준표 · 저장소 구조 · 참고 출처

## 2026 표준 스택 요약

| 계층 | 표준 (AWS) | 표준 (On-Premise) |
|---|---|---|
| Edge | Route 53 · CloudFront · WAF · ACM | 기존 WAF/GSLB + cert-manager |
| Load Balancer | NLB (AWS LB Controller) | HAProxy+Keepalived(API) · MetalLB |
| API Gateway | **Gateway API + Envoy Gateway** (ingress-nginx 2026-03 은퇴) | 동일 |
| Kubernetes | EKS 1.36 + Karpenter + Pod Identity | kubeadm HA + containerd 2.x + Cilium |
| Service Mesh | **Istio ambient** | 동일 |
| Database | Aurora PostgreSQL | CloudNativePG |
| Cache | ElastiCache for **Valkey** | Valkey 공식 Helm |
| Event Streaming | Strimzi (or MSK) — Kafka 4.x KRaft | Strimzi |
| Message Queue | Amazon MQ (or RabbitMQ Operator) | RabbitMQ Cluster Operator |
| Observability | Prometheus · Grafana · **OpenTelemetry** · Loki · **Alloy** | 동일 |
| CI/CD | GitHub Actions(OIDC) + Argo CD | GitLab CI + Argo CD |
| Registry | ECR | Harbor |
| Secrets | Secrets Manager + External Secrets | OpenBao + External Secrets |
| Policy/Security | Kyverno · Falco · Trivy (+GuardDuty) | Kyverno · Falco · Trivy |

## 저장소 구조

```
.
├── index.html                  # 웹 문서 (정적)
├── content/                    # ✏️ 문서 원본(YAML) - 내용 수정은 여기서
│   ├── meta.yaml
│   └── components/*.yaml
├── scripts/build.py            # content + IaC 파일 → assets/js/data/bundle.js
├── assets/                     # css, js (diagram / icons / app)
├── iac/
│   ├── terraform/aws/          # VPC · EKS(v21) · Karpenter · LB · 애드온 · 데이터 · ECR
│   └── ansible/                # kubeadm HA · HAProxy/Keepalived · 애드온 · 구성 리소스
├── helm/
│   ├── helmfile.yaml.gotmpl    # 플랫폼 애드온 일괄 설치 (-e aws | -e onprem)
│   ├── versions.yaml           # 차트 버전 고정
│   ├── values/                 # Terraform · Ansible · Helm 이 공통으로 쓰는 values
│   ├── manifests/              # Gateway · Mesh · CNPG · Kafka · RabbitMQ · ESO · Kyverno ...
│   ├── charts/microservice/    # 공통 마이크로서비스 차트
│   └── argocd/root-app.yaml    # App of Apps
├── ci/github-actions/          # 애플리케이션 CI 예시 (OIDC → ECR, Trivy)
└── .github/workflows/          # validate(정적 검증) · pages(배포)
```

> **단일 소스 원칙** — `helm/values/*.yaml` 은 Terraform(`helm_release`), Ansible(`kubernetes.core.helm`), Helmfile 이 모두 같은 파일을 참조합니다.
> 설치 방식을 바꿔도 플랫폼 구성은 동일하게 유지됩니다.

## 빠른 시작

```bash
# AWS (Terraform 1.10+ 또는 OpenTofu 1.10+)
cd iac/terraform/aws
cp terraform.tfvars.example terraform.tfvars && cp backend.tf.example backend.tf
terraform init && terraform apply

# On-Premise (Ansible)
cd iac/ansible
cp inventory/hosts.ini.example inventory/hosts.ini
ansible-playbook site.yml

# 이미 있는 Kubernetes (Helm)
cd helm
helmfile -e aws apply          # 또는 -e onprem
```

## 문서 수정 방법

```bash
# 1) content/*.yaml 또는 iac/, helm/ 파일 수정
# 2) 번들 재생성 (PyYAML 필요)
python3 scripts/build.py
# 3) index.html 새로고침으로 확인 후 커밋
```

## 검증 상태 (v0.1.0)

| 항목 | 방법 | 결과 |
|---|---|---|
| Terraform HCL 구문 | python-hcl2 파싱 | ✅ 12개 파일 통과 |
| Ansible | `ansible-playbook site.yml --syntax-check` (ansible-core 2.22) | ✅ 통과 |
| YAML (values/manifests/chart values) | PyYAML 파싱 | ✅ 통과 |
| 웹 문서 | Headless Chrome 렌더링 · 라우팅 · 콘솔 에러 | ✅ 에러 없음 |
| `terraform validate` · `helm lint` | `.github/workflows/validate.yml` (GitHub Actions) | ⏳ 첫 push 후 Actions 결과 확인 필요 |
| 실제 클러스터 설치 | — | ⏳ 미실시 (Step 2 에서 dev 계정으로 검증 예정) |

> 차트 버전은 `versions.yaml` / `chart_versions` 가 비어 있으면 최신을 설치합니다. **운영 환경에서는 반드시 검증된 버전으로 고정**하십시오.

## 참고

- 구성도 배치 참고: *The Complete Kubernetes Ecosystem Explained* (Cloud X Berry, YouTube). 구성도는 자체 제작한 SVG 이며, 제품 로고 대신 범용 아이콘을 사용했습니다.
- 버전·성숙도 정보는 2026-11-25 기준 웹 검증 결과이며 출처는 웹 문서 「부록」에 정리되어 있습니다.
