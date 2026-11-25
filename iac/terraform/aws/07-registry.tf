# -----------------------------------------------------------------------------
# 07-registry.tf : 마이크로서비스별 ECR 리포지토리
#   - 태그 불변(IMMUTABLE) : 동일 태그 덮어쓰기 금지 -> 배포 추적성 확보
#   - Enhanced Scanning(Inspector) 은 계정 레벨에서 활성화 권장
# -----------------------------------------------------------------------------
resource "aws_ecr_repository" "svc" {
  for_each = toset(var.microservices)

  name                 = "${var.project}/${each.key}"
  image_tag_mutability = "IMMUTABLE"
  force_delete         = var.environment != "prd"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS"
  }

  tags = local.tags
}

resource "aws_ecr_lifecycle_policy" "svc" {
  for_each   = aws_ecr_repository.svc
  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "untagged 이미지는 7일 후 삭제"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "최근 50개 이미지만 유지"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 50
        }
        action = { type = "expire" }
      }
    ]
  })
}

# ---- GitHub Actions OIDC : 장기 Access Key 없이 ECR push ----
resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
}

data "aws_iam_policy_document" "github_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:navy9564/*:ref:refs/heads/main"]
    }
  }
}

resource "aws_iam_role" "github_ecr_push" {
  name               = "${local.name}-github-ecr-push"
  assume_role_policy = data.aws_iam_policy_document.github_assume.json
}

resource "aws_iam_role_policy_attachment" "github_ecr_push" {
  role       = aws_iam_role.github_ecr_push.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser"
}
