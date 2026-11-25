# -----------------------------------------------------------------------------
# versions.tf
#   Terraform(>= 1.10) / OpenTofu(>= 1.10) 모두에서 동작하도록 작성
#   - terraform-aws-modules/eks v21 은 AWS Provider 6.x, Terraform 1.5.7+ 필요
#   - S3 backend native locking(use_lockfile) 사용을 위해 1.10+ 권장
# -----------------------------------------------------------------------------
terraform {
  required_version = ">= 1.10.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 3.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.38"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}
