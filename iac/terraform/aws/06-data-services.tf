# -----------------------------------------------------------------------------
# 06-data-services.tf : AWS 관리형 데이터 서비스 (토글 방식)
#   use_managed_* = false 이면 클러스터 내부 Operator(CNPG/Valkey/Strimzi/RabbitMQ) 사용
#   모든 데이터 서비스는 intra 서브넷(인터넷 경로 없음)에 배치하고
#   EKS 노드 보안그룹에서 오는 트래픽만 허용한다.
# -----------------------------------------------------------------------------
resource "aws_security_group" "data" {
  name        = "${local.name}-data"
  description = "Data tier - allow only from EKS nodes"
  vpc_id      = module.vpc.vpc_id

  tags = local.tags
}

resource "aws_vpc_security_group_ingress_rule" "data_from_nodes" {
  for_each = {
    postgres = 5432
    valkey   = 6379
    kafka    = 9098 # MSK IAM 인증 포트
    amqps    = 5671
  }

  security_group_id            = aws_security_group.data.id
  referenced_security_group_id = module.eks.node_security_group_id
  from_port                    = each.value
  to_port                      = each.value
  ip_protocol                  = "tcp"
  description                  = "from EKS nodes - ${each.key}"
}

# ---------------------------- Aurora PostgreSQL -------------------------------
module "aurora" {
  count   = var.use_managed_postgres ? 1 : 0
  source  = "terraform-aws-modules/rds-aurora/aws"
  version = "~> 9.0"

  name           = "${local.name}-pg"
  engine         = "aurora-postgresql"
  engine_version = "17"
  instance_class = "db.r8g.large"
  instances      = { one = {}, two = {} }

  vpc_id                 = module.vpc.vpc_id
  create_db_subnet_group = true
  subnets                = module.vpc.intra_subnets
  create_security_group  = false
  vpc_security_group_ids = [aws_security_group.data.id]

  master_username             = "dbadmin"
  manage_master_user_password = true # Secrets Manager 에 자동 저장 -> ESO 로 동기화
  storage_encrypted           = true
  deletion_protection         = var.environment == "prd"
  skip_final_snapshot         = var.environment != "prd"

  tags = local.tags
}

# ---------------------------- ElastiCache Valkey ------------------------------
resource "aws_elasticache_subnet_group" "valkey" {
  count      = var.use_managed_valkey ? 1 : 0
  name       = "${local.name}-valkey"
  subnet_ids = module.vpc.intra_subnets
}

resource "aws_elasticache_replication_group" "valkey" {
  count                = var.use_managed_valkey ? 1 : 0
  replication_group_id = "${local.name}-valkey"
  description          = "Valkey cache for ${local.name}"

  engine               = "valkey"
  engine_version       = "8.1"
  node_type            = "cache.r7g.large"
  parameter_group_name = "default.valkey8"
  port                 = 6379

  num_node_groups         = 1
  replicas_per_node_group = 1

  automatic_failover_enabled = true
  multi_az_enabled           = true
  transit_encryption_enabled = true
  at_rest_encryption_enabled = true

  subnet_group_name  = aws_elasticache_subnet_group.valkey[0].name
  security_group_ids = [aws_security_group.data.id]

  tags = local.tags
}

# ---------------------------- Amazon MSK (Kafka) ------------------------------
resource "aws_msk_cluster" "kafka" {
  count                  = var.use_managed_kafka ? 1 : 0
  cluster_name           = "${local.name}-kafka"
  kafka_version          = "4.1.x" # KRaft 전용 버전 (콘솔/CLI 로 지원 버전 확인 후 고정)
  number_of_broker_nodes = 3

  broker_node_group_info {
    instance_type   = "kafka.m7g.large"
    client_subnets  = module.vpc.intra_subnets
    security_groups = [aws_security_group.data.id]

    storage_info {
      ebs_storage_info {
        volume_size = 200
      }
    }
  }

  client_authentication {
    sasl {
      iam = true
    }
  }

  encryption_info {
    encryption_in_transit {
      client_broker = "TLS"
      in_cluster    = true
    }
  }

  tags = local.tags
}

# ---------------------------- Amazon MQ (RabbitMQ) ----------------------------
resource "random_password" "mq" {
  count   = var.use_managed_rabbitmq ? 1 : 0
  length  = 24
  special = false
}

resource "aws_secretsmanager_secret" "mq" {
  count = var.use_managed_rabbitmq ? 1 : 0
  name  = "${local.name}/rabbitmq/admin"
}

resource "aws_secretsmanager_secret_version" "mq" {
  count     = var.use_managed_rabbitmq ? 1 : 0
  secret_id = aws_secretsmanager_secret.mq[0].id
  secret_string = jsonencode({
    username = "mqadmin"
    password = random_password.mq[0].result
  })
}

resource "aws_mq_broker" "rabbitmq" {
  count       = var.use_managed_rabbitmq ? 1 : 0
  broker_name = "${local.name}-rabbitmq"

  engine_type                = "RabbitMQ"
  engine_version             = "4.2" # 리전에서 지원하는 최신 버전 확인 후 고정
  auto_minor_version_upgrade = true
  host_instance_type         = "mq.m7g.large"
  deployment_mode            = var.environment == "prd" ? "CLUSTER_MULTI_AZ" : "SINGLE_INSTANCE"
  publicly_accessible        = false

  subnet_ids      = var.environment == "prd" ? module.vpc.intra_subnets : [module.vpc.intra_subnets[0]]
  security_groups = [aws_security_group.data.id]

  user {
    username = "mqadmin"
    password = random_password.mq[0].result
  }

  tags = local.tags
}
