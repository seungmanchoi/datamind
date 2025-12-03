# Secrets Manager Module - AWS Secrets Manager for NDMarket

# Database Credentials Secret
resource "aws_secretsmanager_secret" "database" {
  name                    = "${var.project_name}/${var.environment}/database"
  description             = "Database credentials for NDMarket application"
  recovery_window_in_days = var.recovery_window_in_days

  tags = {
    Name        = "${var.project_name}-${var.environment}-db-secret"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "database" {
  secret_id = aws_secretsmanager_secret.database.id
  secret_string = jsonencode({
    DB_HOST     = var.db_host
    DB_PORT     = var.db_port
    DB_USERNAME = var.db_username
    DB_PASSWORD = var.db_password
    DB_DATABASE = var.db_database
  })
}

# OpenSearch Credentials Secret
resource "aws_secretsmanager_secret" "opensearch" {
  name                    = "${var.project_name}/${var.environment}/opensearch"
  description             = "OpenSearch endpoint for NDMarket application"
  recovery_window_in_days = var.recovery_window_in_days

  tags = {
    Name        = "${var.project_name}-${var.environment}-opensearch-secret"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "opensearch" {
  secret_id = aws_secretsmanager_secret.opensearch.id
  secret_string = jsonencode({
    OPENSEARCH_ENDPOINT = var.opensearch_endpoint
  })
}

# IAM Policy for EKS to access Secrets Manager
resource "aws_iam_policy" "secrets_access" {
  name        = "${var.project_name}-${var.environment}-secrets-access"
  description = "Policy to allow EKS pods to access Secrets Manager"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          aws_secretsmanager_secret.database.arn,
          aws_secretsmanager_secret.opensearch.arn
        ]
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-${var.environment}-secrets-access-policy"
    Project     = var.project_name
    Environment = var.environment
  }
}

# IAM Role for External Secrets Operator (IRSA)
data "aws_caller_identity" "current" {}

resource "aws_iam_role" "external_secrets" {
  name = "${var.project_name}-${var.environment}-external-secrets-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = var.oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${replace(var.oidc_provider_url, "https://", "")}:sub" = "system:serviceaccount:ndmarket:external-secrets-sa"
            "${replace(var.oidc_provider_url, "https://", "")}:aud" = "sts.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-${var.environment}-external-secrets-role"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "external_secrets" {
  role       = aws_iam_role.external_secrets.name
  policy_arn = aws_iam_policy.secrets_access.arn
}
